import { startServer } from '@microsoft/agents-hosting-express'
import {
  AgentApplication,
  FileStorage,
  TurnContext,
  TurnState,
} from '@microsoft/agents-hosting'
import { ActivityTypes } from '@microsoft/agents-activity'
import { v4 as uuidv4 } from 'uuid'
import { MemoryManager } from './memoryManager'
import { AiEngine } from './aiEngine'
import { ConversationLog, ConversationTurn } from './types'

// ─────────────────────────────────────────────
// State 인터페이스 정의
// ─────────────────────────────────────────────

interface ConversationState {
  /** 현재 세션의 대화 턴 수 */
  turnCount: number
  /** 현재 대화 세션 ID */
  sessionId: string
  /** 대화 히스토리 (현재 세션) */
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}

type AppTurnState = TurnState<ConversationState>

// ─────────────────────────────────────────────
// 에이전트 초기화
// ─────────────────────────────────────────────

// SDK 제공 FileStorage를 통한 대화 상태 유지
const storage = new FileStorage('__state__')

// 장기 메모리 매니저 (사용자별 기억 축적)
const memoryManager = new MemoryManager(process.env.MEMORY_STORAGE_PATH)

// AI 추론 엔진 (Azure OpenAI + Memory)
const aiEngine = new AiEngine(memoryManager)

// Agent Application 생성
const agent = new AgentApplication<AppTurnState>({ storage })

// ─────────────────────────────────────────────
// 이벤트 핸들러
// ─────────────────────────────────────────────

/** 새 사용자 참가 시 환영 메시지 */
agent.onConversationUpdate('membersAdded', async (context: TurnContext, state: AppTurnState) => {
  const userId = context.activity.from?.id || 'unknown'
  const userName = context.activity.from?.name || '사용자'
  const existingMemory = memoryManager.getUserMemory(userId)

  if (existingMemory.memories.length > 0) {
    // 기존 사용자 → 기억 기반 인사
    const recentMemories = memoryManager.getRecentMemories(userId, 3)
    const lastTopics = recentMemories.map(m => m.extractedContent).join(', ')
    await context.sendActivity(
      `안녕하세요 ${userName}님, 다시 만나뵙게 되어 반갑습니다! 🤝\n\n` +
      `지난번에 이야기 나눴던 내용을 기억하고 있습니다.\n` +
      `최근 관심사: ${lastTopics}\n\n` +
      `오늘은 어떤 이야기를 나눠볼까요?`
    )
  } else {
    // 신규 사용자 → 소개
    await context.sendActivity(
      `안녕하세요 ${userName}님! 저는 **비즈니스 파트너 에이전트**입니다. 🤝\n\n` +
      `저는 단순한 AI 도구가 아니라, 대화를 통해 ${userName}님을 알아가고 ` +
      `축적된 기억을 바탕으로 맞춤형 조언을 드리는 파트너입니다.\n\n` +
      `대화를 나눌수록 ${userName}님의 업무 스타일, 선호, 목표를 더 잘 이해하게 됩니다.\n\n` +
      `**사용 가능한 명령어:**\n` +
      `- \`/memory\` - 현재 축적된 기억 확인\n` +
      `- \`/forget [키워드]\` - 특정 기억 삭제 요청\n` +
      `- \`/profile\` - 나의 프로필 요약 보기\n\n` +
      `무엇이든 편하게 말씀해 주세요!`
    )
  }
})

/** /memory 명령어 - 축적된 기억 확인 */
agent.onMessage('/memory', async (context: TurnContext, state: AppTurnState) => {
  const userId = context.activity.from?.id || 'unknown'
  const memoryContext = memoryManager.getMemoryContext(userId)
  await context.sendActivity(memoryContext)
})

/** /profile 명령어 - 사용자 프로필 요약 */
agent.onMessage('/profile', async (context: TurnContext, state: AppTurnState) => {
  const userId = context.activity.from?.id || 'unknown'
  const store = memoryManager.getUserMemory(userId)

  if (store.profileSummary) {
    await context.sendActivity(
      `**📋 ${context.activity.from?.name || '사용자'}님의 프로필 요약**\n\n${store.profileSummary}`
    )
  } else {
    await context.sendActivity(
      '아직 프로필이 생성되지 않았습니다. 대화를 더 나누면 자동으로 프로필이 생성됩니다.'
    )
  }
})

/** /forget 명령어 - 기억 삭제 */
agent.onMessage('/forget', async (context: TurnContext, state: AppTurnState) => {
  const userId = context.activity.from?.id || 'unknown'
  const keyword = (context.activity.text || '').replace('/forget', '').trim()

  if (!keyword) {
    await context.sendActivity('삭제할 기억의 키워드를 입력해 주세요. 예: `/forget 프로젝트A`')
    return
  }

  const store = memoryManager.getUserMemory(userId)
  const before = store.memories.length
  store.memories = store.memories.filter(m => {
    const text = `${m.extractedContent} ${m.keywords.join(' ')}`.toLowerCase()
    return !text.includes(keyword.toLowerCase())
  })
  const removed = before - store.memories.length
  memoryManager.saveUserMemory(store)

  await context.sendActivity(
    removed > 0
      ? `"${keyword}" 관련 기억 ${removed}개를 삭제했습니다.`
      : `"${keyword}" 관련 기억을 찾지 못했습니다.`
  )
})

/** 일반 메시지 처리 - 핵심 대화 로직 */
agent.onActivity(ActivityTypes.Message, async (context: TurnContext, state: AppTurnState) => {
  const userMessage = context.activity.text || ''
  const userId = context.activity.from?.id || 'unknown'

  // 명령어는 위에서 처리하므로 스킵
  if (userMessage.startsWith('/')) return

  // 대화 상태 초기화
  if (!state.conversation.sessionId) {
    state.conversation.sessionId = uuidv4()
    state.conversation.turnCount = 0
    state.conversation.history = []
    memoryManager.incrementConversationCount(userId)
  }

  state.conversation.turnCount++

  // 대화 히스토리에 사용자 메시지 추가
  state.conversation.history.push({ role: 'user', content: userMessage })

  // 타이핑 인디케이터
  await context.sendActivity({ type: 'typing' })

  try {
    // AI 엔진으로 응답 생성 (메모리 컨텍스트 포함)
    const response = await aiEngine.generateResponse(
      userId,
      userMessage,
      state.conversation.history
    )

    // 대화 히스토리에 에이전트 응답 추가
    state.conversation.history.push({ role: 'assistant', content: response })

    // 히스토리 크기 제한 (최근 20턴)
    if (state.conversation.history.length > 40) {
      state.conversation.history = state.conversation.history.slice(-40)
    }

    // 대화 로그 저장
    const log: ConversationLog = {
      conversationId: state.conversation.sessionId,
      startedAt: new Date().toISOString(),
      turns: state.conversation.history.map((h, i) => ({
        turnIndex: i,
        timestamp: new Date().toISOString(),
        role: h.role,
        message: h.content,
      })),
    }
    memoryManager.saveConversationLog(userId, log)

    // 응답 전송
    await context.sendActivity(response)
  } catch (err) {
    console.error('응답 생성 실패:', err)
    await context.sendActivity(
      '죄송합니다. 응답을 생성하는 중 문제가 발생했습니다. 다시 시도해 주세요.'
    )
  }
})

// ─────────────────────────────────────────────
// 서버 시작
// ─────────────────────────────────────────────
console.log('🤝 비즈니스 파트너 에이전트를 시작합니다...')
startServer(agent)
