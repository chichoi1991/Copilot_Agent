# 비즈니스 파트너 에이전트 (Business Partner Agent)

> 기억을 축적하고 조언하는 비즈니스 파트너형 에이전트  
> Microsoft 365 Agents SDK 기반

## 개요

이 에이전트는 단순한 Q&A 도구가 아니라, **사용자와의 모든 대화를 '기억 자산'으로 축적**하고 그 기억을 기반으로 **맞춤형 조언과 업무 지원을 수행하는 개인화된 비즈니스 파트너**입니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| **장기 메모리** | 대화에서 핵심 정보를 자동 추출하여 사용자별로 영구 저장 |
| **맥락 기반 응답** | 과거 대화 기억을 활용하여 맞춤형 답변 생성 |
| **피드백 루프** | 사용자의 지시·선호·결정을 학습하여 점점 정확해짐 |
| **프로필 자동 생성** | 축적된 기억을 기반으로 사용자 프로필 요약 자동 갱신 |
| **대화 로그** | 날짜별/세션별 대화 기록 저장 |

### 일반 Copilot Agent vs 이 에이전트

| 구분 | 일반 Copilot Agent | 비즈니스 파트너 에이전트 |
|------|-------------------|----------------------|
| 기억 | 세션 단위 | **장기 축적 메모리** |
| 맥락 | 요청 단위 | **사용자 개인 히스토리** |
| 역할 | 도구 | **비즈니스 파트너** |
| 학습 | 없음 | **피드백 루프 기반 학습** |

## 기술 스택

- **Microsoft 365 Agents SDK** (`@microsoft/agents-hosting` v1.4.1)
- **Azure OpenAI** (GPT-4o) - 대화 생성 & 기억 추출
- **TypeScript / Node.js**
- **FileStorage** (개발) / Azure Blob Storage (프로덕션)

## 프로젝트 구조

```
business-partner-agent/
├── src/
│   ├── index.ts           # 에이전트 메인 (SDK 핸들러)
│   ├── memoryManager.ts   # 장기 기억 관리 모듈
│   ├── aiEngine.ts        # Azure OpenAI 추론 엔진
│   └── types.ts           # 타입 정의
├── memory_store/          # 사용자별 메모리 저장소 (런타임 생성)
│   └── users/
│       └── {userId}/
│           ├── memory.json           # 장기 기억
│           └── conversations/        # 날짜별 대화 로그
│               └── {YYYY-MM-DD}/
├── __state__/             # SDK TurnState 저장소 (런타임)
├── package.json
├── tsconfig.json
├── env.TEMPLATE
└── README.md
```

## 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 설정
```bash
cp env.TEMPLATE .env
```

`.env` 파일에 Azure OpenAI 정보를 입력합니다:
```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
PORT=3978
MEMORY_STORAGE_PATH=./memory_store
```

### 3. 빌드 & 실행
```bash
npm run build
npm start
```

### 4. 로컬 테스트 (Agents Playground)
```bash
npm test
```
이 명령어는 에이전트 서버와 M365 Agents Playground를 동시에 실행합니다.

## 사용자 명령어

| 명령어 | 설명 |
|--------|------|
| `/memory` | 현재 축적된 기억 확인 |
| `/profile` | 자동 생성된 나의 프로필 요약 보기 |
| `/forget [키워드]` | 특정 키워드 관련 기억 삭제 |

## 메모리 시스템

### 기억 카테고리
- **instruction** - 사용자의 지시·요청 사항
- **preference** - 선호·스타일·기준
- **decision** - 의사결정 및 그 이유
- **knowledge** - 도메인 지식·전문 정보
- **feedback** - 에이전트 응답에 대한 피드백
- **context** - 업무 상황·배경 정보
- **goal** - 목표·방향성

### 동작 흐름
```
사용자 메시지 → Azure OpenAI 응답 생성 (기억 컨텍스트 포함)
                    ↓
              에이전트 응답
                    ↓
         LLM으로 기억할 정보 자동 추출
                    ↓
         메모리 저장소에 영구 저장 (피드백 루프)
                    ↓
         10개 축적 시 프로필 요약 자동 갱신
```

## 프로덕션 배포

Azure Blob Storage를 사용하려면 `src/index.ts`에서 storage를 변경합니다:

```typescript
import { BlobsStorage } from '@microsoft/agents-hosting-storage-blob'

const storage = new BlobsStorage(
  'agent-state',
  process.env.AZURE_STORAGE_CONNECTION_STRING
)
```

## 라이선스

MIT
