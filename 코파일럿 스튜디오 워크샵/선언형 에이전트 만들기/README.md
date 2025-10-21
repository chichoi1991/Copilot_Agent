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
``

참고 자료: [효과적인 지침 작성 방법](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/declarative-agent-instructions)
