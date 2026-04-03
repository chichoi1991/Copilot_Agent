import { AzureOpenAI } from 'openai'
import { MemoryEntry, MemoryCategory } from './types'
import { MemoryManager } from './memoryManager'

/**
 * AiEngine - Azure OpenAI를 활용한 AI 추론 엔진
 * 
 * 기능:
 * 1. 메모리 컨텍스트를 포함한 대화 생성
 * 2. 대화에서 기억할 정보 자동 추출
 * 3. 사용자 프로필 요약 자동 생성
 */
export class AiEngine {
  private client: AzureOpenAI
  private deploymentName: string
  private memoryManager: MemoryManager

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o'

    this.client = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: '2024-12-01-preview',
    })
  }

  /**
   * 메모리 기반 응답 생성
   * - 관련 기억을 검색하여 시스템 프롬프트에 포함
   * - 사용자 프로필 컨텍스트를 함께 제공
   */
  async generateResponse(
    userId: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    // 1. 관련 기억 검색
    const relevantMemories = this.memoryManager.searchMemories(userId, userMessage, 8)
    const memoryContext = this.memoryManager.getMemoryContext(userId)
    const recentMemories = this.memoryManager.getRecentMemories(userId, 3)

    // 2. 시스템 프롬프트 구성
    const systemPrompt = this.buildSystemPrompt(memoryContext, relevantMemories, recentMemories)

    // 3. 메시지 배열 구성
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // 최근 10턴만
      { role: 'user', content: userMessage },
    ]

    // 4. Azure OpenAI 호출
    const response = await this.client.chat.completions.create({
      model: this.deploymentName,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    })

    const assistantMessage = response.choices[0]?.message?.content || '응답을 생성하지 못했습니다.'

    // 5. 대화에서 기억할 정보 비동기 추출
    this.extractAndSaveMemories(userId, userMessage, assistantMessage).catch(err => {
      console.error('메모리 추출 실패:', err)
    })

    return assistantMessage
  }

  /**
   * 대화에서 기억할 정보를 LLM으로 자동 추출하여 저장
   */
  private async extractAndSaveMemories(
    userId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<void> {
    const extractionPrompt = `아래 대화에서 장기적으로 기억해야 할 핵심 정보를 추출하세요.

사용자 메시지: "${userMessage}"
에이전트 응답: "${assistantResponse}"

다음 JSON 배열 형식으로 응답하세요. 기억할 내용이 없으면 빈 배열 []을 반환하세요.
[
  {
    "category": "instruction|preference|decision|knowledge|feedback|context|goal",
    "content": "기억할 핵심 내용 (한 줄 요약)",
    "keywords": ["키워드1", "키워드2"],
    "importance": 1~5 (중요도)
  }
]

기준:
- 일상적인 인사, 단순 질문은 저장하지 않습니다
- 사용자의 선호, 지시, 결정, 전문 지식, 업무 맥락은 반드시 저장합니다
- 중요도는 반복 사용될 가능성이 높을수록 높게 설정합니다
- JSON만 출력하세요`

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: '당신은 대화에서 핵심 정보를 추출하는 전문가입니다. JSON만 출력하세요.' },
          { role: 'user', content: extractionPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })

      const raw = response.choices[0]?.message?.content?.trim() || '[]'
      // JSON 배열만 추출
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) return

      const items = JSON.parse(jsonMatch[0]) as Array<{
        category: MemoryCategory
        content: string
        keywords: string[]
        importance: number
      }>

      for (const item of items) {
        this.memoryManager.addMemory(
          userId,
          item.category,
          userMessage,
          item.content,
          item.keywords,
          item.importance
        )
      }

      // 기억이 10개 이상 쌓이면 프로필 요약 갱신
      const store = this.memoryManager.getUserMemory(userId)
      if (store.memories.length > 0 && store.memories.length % 10 === 0) {
        await this.updateProfileSummary(userId)
      }
    } catch (err) {
      console.error('메모리 추출 파싱 실패:', err)
    }
  }

  /**
   * 축적된 기억을 기반으로 사용자 프로필 요약을 LLM으로 재생성
   */
  private async updateProfileSummary(userId: string): Promise<void> {
    const store = this.memoryManager.getUserMemory(userId)
    const memorySummaries = store.memories
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 30)
      .map(m => `[${m.category}] ${m.extractedContent}`)
      .join('\n')

    const response = await this.client.chat.completions.create({
      model: this.deploymentName,
      messages: [
        {
          role: 'system',
          content: '아래 기억 목록을 기반으로 이 사용자의 업무 스타일, 선호, 관심사를 3~5문장으로 요약하세요.',
        },
        { role: 'user', content: memorySummaries },
      ],
      temperature: 0.5,
      max_tokens: 500,
    })

    const summary = response.choices[0]?.message?.content || ''
    if (summary) {
      this.memoryManager.updateProfileSummary(userId, summary)
    }
  }

  /**
   * 시스템 프롬프트 빌드 - 메모리 컨텍스트를 포함
   */
  private buildSystemPrompt(
    memoryContext: string,
    relevantMemories: MemoryEntry[],
    recentMemories: MemoryEntry[]
  ): string {
    let prompt = `당신은 "비즈니스 파트너 에이전트"입니다.
당신의 역할은 단순한 도구가 아니라, 사용자의 업무를 깊이 이해하고 장기적으로 함께 성장하는 비즈니스 파트너입니다.

## 핵심 원칙
1. **기억 활용**: 과거 대화에서 축적된 기억을 적극적으로 활용하여 맥락 있는 답변을 제공합니다.
2. **맞춤 조언**: 사용자의 선호, 의사결정 패턴, 업무 스타일을 반영합니다.
3. **선제적 제안**: 과거 지시나 목표를 기억하고, 관련 상황에서 먼저 제안합니다.
4. **피드백 반영**: 사용자의 피드백을 기억하여 점점 더 정확한 파트너가 됩니다.

## 응답 스타일
- 한국어로 응답합니다.
- 과거 기억을 참조할 때는 자연스럽게 언급합니다. (예: "이전에 말씀하셨듯이...")
- 지나치게 기억을 나열하지 말고, 맥락에 맞게 활용합니다.
`

    // 메모리 컨텍스트 추가
    if (memoryContext && !memoryContext.includes('아직 축적된 기억이 없습니다')) {
      prompt += `\n---\n${memoryContext}\n`
    }

    // 관련 기억 추가
    if (relevantMemories.length > 0) {
      prompt += `\n### 현재 질문과 관련된 과거 기억\n`
      for (const m of relevantMemories) {
        prompt += `- [${m.category}/${m.timestamp.split('T')[0]}] ${m.extractedContent}\n`
      }
    }

    // 최근 기억 추가
    if (recentMemories.length > 0) {
      prompt += `\n### 최근 기억\n`
      for (const m of recentMemories) {
        prompt += `- [${m.timestamp.split('T')[0]}] ${m.extractedContent}\n`
      }
    }

    return prompt
  }
}
