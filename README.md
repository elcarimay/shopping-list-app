# 🛒 쇼핑 리스트 앱

로컬스토리지 기반의 간단한 쇼핑 리스트 웹 앱입니다.

## 기능

- 항목 추가 (버튼 클릭 또는 Enter 키)
- 항목 체크/해제
- 개별 항목 삭제
- 완료 항목 일괄 삭제
- 새로고침 후에도 데이터 유지 (localStorage)
- XSS 방어 (HTML 이스케이프)

## 사용법

`shopping-list.html` 파일을 브라우저에서 열면 바로 사용할 수 있습니다.

## 테스트

```bash
npm install
node test-shopping.js
```

Playwright Chromium을 사용한 자동화 테스트가 포함되어 있습니다.
