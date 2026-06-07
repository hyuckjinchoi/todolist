# 나의 To-do List

GitHub Pages에 바로 배포할 수 있는 정적 To-do-list 웹앱입니다.

## 사용 방법

- 항목은 필수 입력입니다.
- 기한과 설명은 비워둘 수 있습니다.
- 추가한 항목은 Google Sheets에 저장됩니다.
- 기한이 빠른 항목이 위에 오고, 기한이 없는 항목은 아래에 표시됩니다.

## Google Sheets 연동

1. 새 Google Sheet를 만듭니다.
2. `Extensions > Apps Script`를 엽니다.
3. `google-apps-script/Code.gs` 내용을 Apps Script 편집기에 붙여넣습니다.
4. Apps Script의 `Project Settings > Script properties`에서 `TODO_PASSWORD` 값을 추가합니다.
5. Apps Script가 스프레드시트와 분리된 프로젝트라면 `SPREADSHEET_ID` 값도 추가합니다.
6. `Deploy > New deployment > Web app`으로 배포합니다.
7. 실행 사용자는 본인, 접근 권한은 Anyone으로 설정합니다.
8. 배포 후 나온 Web App URL을 `script.js`의 `APPS_SCRIPT_URL`에 입력합니다.

## GitHub Pages 배포

1. 이 폴더의 파일을 GitHub 저장소에 올립니다.
2. GitHub 저장소의 `Settings > Pages`에서 배포 브랜치를 선택합니다.
3. `index.html`이 있는 루트 폴더를 Pages 대상으로 지정합니다.

## 보안 참고

이 앱은 정적 GitHub Pages에서 실행되고, Apps Script가 비밀번호를 확인한 뒤 Google Sheets를 읽고 씁니다. 개인용 동기화에는 충분히 단순하지만, 전문적인 계정 인증 시스템을 대신하지는 않습니다.
