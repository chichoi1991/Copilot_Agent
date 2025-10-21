# Copilot Studio 실습 - 선언형 에이전트 만들기
---

# ✅ 선언적 에이전트(Declarative Agent)란?

**선언적 에이전트**는 Microsoft 365 Copilot 확장성 모델에서 제공하는 **코드 작성 없이 지침(Instructions)만으로 동작을 정의하는 방식의 에이전트**입니다. 개발자가 복잡한 프로그래밍을 하지 않고도, **사용자 요청을 처리하는 규칙과 데이터 소스 연결을 선언적으로 기술**하여 Copilot 환경에서 실행할 수 있도록 설계되었습니다.

이곳에서는 Copilot studio에서 선언형 에이전트를 만들어 초보자로 손쉽게 특수한 목적을 가진 AI Agent를 만들어 운용할 수 있도록 해 보겠습니다.

---

## 🔍 핵심 특징
| 특징 | 설명 |
|------|------|
| **Low-Code / No-Code** | 코드 대신 **지침 기반**으로 동작을 정의 |
| **Microsoft 365 통합** | SharePoint, OneDrive, Teams 등과 자연스럽게 연결 |
| **확장성** | 다양한 데이터 소스 및 API 연동 가능 |
| **안전성** | Microsoft 365 보안 및 규정 준수 정책을 그대로 적용 |

---

## 🛠 주요 구성 요소
- **지침(Instructions)**: 에이전트가 어떤 작업을 수행할지 정의하는 규칙
- **데이터 소스 연결**: SharePoint, Dataverse 등에서 데이터를 검색·요약
- **출력 형식 지정**: 마크다운, 표, 텍스트 등 사용자 친화적 결과 제공

---

## ✅ 활용 예시
- **문서 검색 에이전트**: SharePoint에서 특정 보고서를 찾아 요약
- **통계 분석 에이전트**: Excel 기반 시계열 데이터를 분석 후 인사이트 제공
- **업무 자동화 에이전트**: 승인 요청, 메일 발송 등 반복 작업 처리


## 🛠 선언형 에이전트를 구축하는데 이용할 수 있는 도구들

선언적 에이전트를 빌드하기 위한 다양한 도구와 각 도구의 특징, 권장 사용 사례를 아래와 같이 비교합니다.

## 1. 도구 및 권장 용도

| 도구 | 코딩 레벨 | 설명 | 권장 사용자 |
|------|----------|------|-------------|
| **Microsoft 365 Agents Toolkit** | 프로 코드 | 고급 기능(커스텀 API 액션, Adaptive Card, CI/CD 등) 포함 | 개발자, API 확장 및 소스 코드 제어가 필요한 경우 |
| **Copilot Studio (Full Experience)** | 로우 코드 | 드래그 앤 드롭 인터페이스, Power Platform 통합, 고급 작업 지원 | 정보 담당자, 업무 자동화 필요 |
| **Copilot Studio Lite Experience** | 노코드 | 간단 설정으로 에이전트 생성 가능 | 코드 경험 없는 업무 사용자 (온보딩, 문서 답변 등) |
| **SharePoint Agents** | 노코드 | SharePoint/Teams 내에서 실행되는 에이전트 | 특정 사이트, 라이브러리, 문서 사용 우선시하는 업무 사용자 |

---

## 2. 요구 조건 및 배포 방법

| 도구 | 요구사항 | 배포 대상 |
|------|----------|-----------|
| **Agents Toolkit** | Microsoft 365 구독 + 사이드로딩, Visual Studio/VS Code, Azure 구독(선택) | Organizations with Copilot license |
| **Copilot Studio Full** | Microsoft 365 구독 + Copilot 라이선스 + Copilot Studio 설치 | Copilot 이용 중인 사용자 |
| **Copilot Studio Lite** | Microsoft 365 구독 + “Create agent” 옵션 활성화 | Microsoft 365/Teams 중 사용 |
| **SharePoint Agents** | Microsoft 365 구독 + 사이트 관리자 권한 | SharePoint 사이트 내 직접 배포 |

---

## 3. 도구별 장단점

| 도구 | ✅ 장점 | ⚠️ 단점 |
|------|---------|----------|
| **Agents Toolkit** | • 전문 개발자 대상 환경<br>• 커스터마이징 API 유연성<br>• Adaptive Card 지원 및 CI/CD<br>• 신기능 우선 적용 | • Power Platform 연결 지원 부족<br>• UI 없이 JSON 편집 필요<br>• 가파른 학습 곡선 |
| **Copilot Studio Full** | • 로우 코드 UI (드래그 앤 드롭)<br>• Power Platform 연결 사용 가능 | • 코드 제어 한계<br>• CI/CD 소스 제어 미지원<br>• Adaptive Card 제한 |
| **Copilot Studio Lite** | • 매우 단순한 설정<br>• 신뢰도 높은 실무형 기능 | • 고급 설정 불가<br>• 기능 제한됨 |
| **SharePoint Agents** | • 특정 라이브러리 중심으로 맞춤 설정 가능<br>• SharePoint, Teams에 즉시 통합 | • SharePoint 외부에서는 사용 어려움 |

---

## ✅ 요약

- **개발자 대상**: `Agents Toolkit` – 커스터마이징 & CI/CD 환경에 적합
- **정보 담당자/비즈니스 사용자**: `Copilot Studio Full` – 로우 코드로 복잡한 로직 구현 가능
- **코딩 경험 없음**: `Copilot Studio Lite` 또는 `SharePoint Agents` – 간단 설정으로 업무 대응

# ✅ 효과적인 지침(Instructions)의 중요성과 작성법

## 🔍 왜 지침이 중요한가?
- **에이전트의 행동을 결정하는 핵심 요소**: 지침은 Copilot이 어떤 작업을 수행하고 어떤 방식으로 응답할지를 정의합니다.
- **사용자 경험 향상**: 명확하고 구체적인 지침은 정확한 답변과 일관된 결과를 제공합니다.
- **보안 및 규정 준수 유지**: 지침을 통해 데이터 접근 범위와 처리 규칙을 명확히 설정할 수 있습니다.

---

## 🛠 효과적인 지침 작성 원칙
| 원칙 | 설명 |
|------|------|
| **명확성** | 모호한 표현을 피하고, 구체적인 작업과 조건을 명시합니다. |
| **간결성** | 불필요한 문장은 줄이고 핵심 규칙만 포함합니다. |
| **맥락 제공** | 데이터 소스, 출력 형식, 예외 처리 등 필요한 정보를 포함합니다. |
| **사용자 친화성** | 결과는 표, 마크다운 등 직관적인 형식으로 제공하도록 지시합니다. |
| **안전성** | 민감 데이터 처리 시 규정 준수 및 보안 정책을 명시합니다. |

---

## ✅ 작성 예시
**목적**: SharePoint에서 문서를 검색하고 요약  
**지침 예시**:
- 사용자가 요청한 키워드로 SharePoint 문서를 검색합니다.
- 검색 결과에서 가장 관련성이 높은 문서를 선택합니다.
- 문서의 핵심 내용을 3~5줄로 요약하고, 원본 문서 이름과 위치를 표시합니다.
- 출력은 마크다운 표 형식으로 제공합니다.

---

📌 참고 문서:  
[Declarative Agent Instructions – Microsoft Docs](https://learn.microsoft.com/ko-kr/microsoft-365-copilot/extensibility/declarative-agent-tool-comparison)



## 교육에 참고된 자료들
참고 자료#1: [선언형 에이전트 개발도구 개요](https://learn.microsoft.com/ko-kr/microsoft-365-copilot/extensibility/declarative-agent-tool-comparison)

참고 자료#2: [코파일럿 스튜디오에서 선언형 에이전트 생성](https://learn.microsoft.com/ko-kr/microsoft-copilot-studio/microsoft-copilot-extend-copilot-extensions?context=%2Fmicrosoft-365-copilot%2Fextensibility%2Fcontext)

참고 자료#3: [효과적인 지침 작성 방법](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/declarative-agent-instructions)
