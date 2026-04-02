/**
 * MemoryEntry - 개별 기억 항목의 인터페이스
 * 사용자와의 대화에서 추출한 핵심 정보를 구조화하여 저장
 */
export interface MemoryEntry {
  /** 고유 식별자 */
  id: string
  /** 기억 생성 시각 (ISO 8601) */
  timestamp: string
  /** 기억 유형 */
  category: MemoryCategory
  /** 원본 사용자 발화 요약 */
  userMessage: string
  /** 에이전트가 추출한 핵심 내용 */
  extractedContent: string
  /** 관련 키워드 (검색용) */
  keywords: string[]
  /** 중요도 (1~5, 높을수록 중요) */
  importance: number
  /** 이 기억이 참조된 횟수 */
  referenceCount: number
  /** 마지막으로 참조된 시각 */
  lastReferencedAt?: string
}

/** 기억 카테고리 */
export type MemoryCategory =
  | 'instruction'     // 사용자의 지시·요청 사항
  | 'preference'      // 선호·스타일·기준
  | 'decision'        // 의사결정 및 그 이유
  | 'knowledge'       // 도메인 지식·전문 정보
  | 'feedback'        // 피드백 (에이전트 응답에 대한)
  | 'context'         // 업무 상황·배경 정보
  | 'goal'            // 목표·방향성

/**
 * UserMemoryStore - 사용자별 메모리 저장소
 * 한 사용자의 전체 기억을 관리
 */
export interface UserMemoryStore {
  /** 사용자 ID */
  userId: string
  /** 사용자 표시 이름 */
  displayName?: string
  /** 저장소 생성 시각 */
  createdAt: string
  /** 마지막 업데이트 시각 */
  updatedAt: string
  /** 총 대화 횟수 */
  totalConversations: number
  /** 기억 항목 목록 */
  memories: MemoryEntry[]
  /** 사용자 프로필 요약 (기억 기반 자동 생성) */
  profileSummary: string
}

/**
 * ConversationLog - 대화 로그
 */
export interface ConversationLog {
  /** 대화 세션 ID */
  conversationId: string
  /** 시작 시각 */
  startedAt: string
  /** 종료 시각 */
  endedAt?: string
  /** 대화 턴 목록 */
  turns: ConversationTurn[]
}

export interface ConversationTurn {
  /** 턴 순서 */
  turnIndex: number
  /** 시각 */
  timestamp: string
  /** 역할 */
  role: 'user' | 'assistant'
  /** 메시지 내용 */
  message: string
}
