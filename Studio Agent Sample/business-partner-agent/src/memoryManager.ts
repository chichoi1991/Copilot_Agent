import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { MemoryEntry, MemoryCategory, UserMemoryStore, ConversationLog, ConversationTurn } from './types'

/**
 * MemoryManager - 사용자별 장기 기억을 관리하는 핵심 모듈
 * 
 * 기능:
 * 1. 대화에서 핵심 정보를 추출하여 기억으로 저장
 * 2. 관련 기억을 검색하여 컨텍스트로 제공
 * 3. 기억을 기반으로 사용자 프로필 요약 생성
 * 4. 대화 로그를 날짜별로 저장
 */
export class MemoryManager {
  private storagePath: string

  constructor(storagePath?: string) {
    this.storagePath = storagePath || process.env.MEMORY_STORAGE_PATH || './memory_store'
    this.ensureDirectoryExists(this.storagePath)
  }

  // ─────────────────────────────────────────────
  // 기억 저장 (Memory Persistence)
  // ─────────────────────────────────────────────

  /** 사용자의 메모리 저장소 로드 (없으면 새로 생성) */
  getUserMemory(userId: string): UserMemoryStore {
    const filePath = this.getUserMemoryPath(userId)
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw) as UserMemoryStore
    }
    return this.createUserMemory(userId)
  }

  /** 사용자의 메모리 저장소를 디스크에 저장 */
  saveUserMemory(store: UserMemoryStore): void {
    store.updatedAt = new Date().toISOString()
    const filePath = this.getUserMemoryPath(store.userId)
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8')
  }

  // ─────────────────────────────────────────────
  // 기억 추가 (Memory Accumulation)
  // ─────────────────────────────────────────────

  /** 새 기억 항목 추가 */
  addMemory(
    userId: string,
    category: MemoryCategory,
    userMessage: string,
    extractedContent: string,
    keywords: string[],
    importance: number = 3
  ): MemoryEntry {
    const store = this.getUserMemory(userId)
    const entry: MemoryEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      category,
      userMessage,
      extractedContent,
      keywords,
      importance: Math.max(1, Math.min(5, importance)),
      referenceCount: 0,
    }
    store.memories.push(entry)
    this.saveUserMemory(store)
    return entry
  }

  // ─────────────────────────────────────────────
  // 기억 검색 (Memory Retrieval)
  // ─────────────────────────────────────────────

  /** 키워드 기반 관련 기억 검색 */
  searchMemories(userId: string, query: string, maxResults: number = 10): MemoryEntry[] {
    const store = this.getUserMemory(userId)
    const queryTokens = this.tokenize(query)

    // 각 기억의 관련도 점수 계산
    const scored = store.memories.map(memory => {
      let score = 0
      const memoryText = `${memory.extractedContent} ${memory.keywords.join(' ')}`.toLowerCase()

      for (const token of queryTokens) {
        if (memoryText.includes(token)) {
          score += 2
        }
        if (memory.keywords.some(k => k.toLowerCase().includes(token))) {
          score += 3
        }
      }

      // 중요도 가중치
      score *= (memory.importance / 3)

      // 최근 기억일수록 가중치 부여
      const ageInDays = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      const recencyBoost = Math.max(0.5, 1 - (ageInDays / 365))
      score *= recencyBoost

      return { memory, score }
    })

    // 점수 순으로 정렬 후 상위 N개 반환
    const results = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(s => s.memory)

    // 참조 횟수 업데이트
    for (const mem of results) {
      mem.referenceCount++
      mem.lastReferencedAt = new Date().toISOString()
    }
    if (results.length > 0) {
      this.saveUserMemory(store)
    }

    return results
  }

  /** 카테고리별 기억 조회 */
  getMemoriesByCategory(userId: string, category: MemoryCategory): MemoryEntry[] {
    const store = this.getUserMemory(userId)
    return store.memories.filter(m => m.category === category)
  }

  /** 최근 기억 N개 조회 */
  getRecentMemories(userId: string, count: number = 5): MemoryEntry[] {
    const store = this.getUserMemory(userId)
    return store.memories
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, count)
  }

  // ─────────────────────────────────────────────
  // 프로필 요약 (Profile Summary)
  // ─────────────────────────────────────────────

  /** 메모리 통계 기반 사용자 프로필 요약 생성 */
  getMemoryContext(userId: string): string {
    const store = this.getUserMemory(userId)

    if (store.memories.length === 0) {
      return '아직 축적된 기억이 없습니다. 대화를 통해 사용자를 알아가는 중입니다.'
    }

    const catCounts: Record<string, number> = {}
    for (const m of store.memories) {
      catCounts[m.category] = (catCounts[m.category] || 0) + 1
    }

    const topKeywords = this.getTopKeywords(store.memories, 10)
    const highImportance = store.memories.filter(m => m.importance >= 4)

    let summary = `## 사용자 기억 프로필\n`
    summary += `- 총 기억 수: ${store.memories.length}개\n`
    summary += `- 총 대화 수: ${store.totalConversations}회\n`
    summary += `- 주요 키워드: ${topKeywords.join(', ')}\n`
    summary += `\n### 카테고리별 분포\n`
    for (const [cat, count] of Object.entries(catCounts)) {
      summary += `- ${this.getCategoryLabel(cat)}: ${count}개\n`
    }

    if (highImportance.length > 0) {
      summary += `\n### 핵심 기억 (중요도 4 이상)\n`
      for (const m of highImportance.slice(0, 5)) {
        summary += `- [${this.getCategoryLabel(m.category)}] ${m.extractedContent}\n`
      }
    }

    if (store.profileSummary) {
      summary += `\n### 프로필 요약\n${store.profileSummary}\n`
    }

    return summary
  }

  /** 프로필 요약 업데이트 */
  updateProfileSummary(userId: string, summary: string): void {
    const store = this.getUserMemory(userId)
    store.profileSummary = summary
    this.saveUserMemory(store)
  }

  // ─────────────────────────────────────────────
  // 대화 로그 (Conversation Logging)
  // ─────────────────────────────────────────────

  /** 대화 로그 저장 (날짜별 폴더) */
  saveConversationLog(userId: string, log: ConversationLog): void {
    const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const logDir = path.join(this.storagePath, 'users', userId, 'conversations', dateStr)
    this.ensureDirectoryExists(logDir)

    const filePath = path.join(logDir, `${log.conversationId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8')
  }

  /** 대화 턴 증가 카운트 */
  incrementConversationCount(userId: string): void {
    const store = this.getUserMemory(userId)
    store.totalConversations++
    this.saveUserMemory(store)
  }

  // ─────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────

  private createUserMemory(userId: string): UserMemoryStore {
    const store: UserMemoryStore = {
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalConversations: 0,
      memories: [],
      profileSummary: '',
    }
    this.saveUserMemory(store)
    return store
  }

  private getUserMemoryPath(userId: string): string {
    const userDir = path.join(this.storagePath, 'users', userId)
    this.ensureDirectoryExists(userDir)
    return path.join(userDir, 'memory.json')
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\sㄱ-ㅎ가-힣]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2)
  }

  private getTopKeywords(memories: MemoryEntry[], count: number): string[] {
    const freq: Record<string, number> = {}
    for (const m of memories) {
      for (const k of m.keywords) {
        freq[k] = (freq[k] || 0) + 1
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(e => e[0])
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      instruction: '지시사항',
      preference: '선호/스타일',
      decision: '의사결정',
      knowledge: '도메인 지식',
      feedback: '피드백',
      context: '업무 맥락',
      goal: '목표/방향',
    }
    return labels[category] || category
  }
}
