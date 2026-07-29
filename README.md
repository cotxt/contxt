# FOFU Landing Page

FOFU의 현장 이미지를 활용한 반응형 정적 랜딩페이지입니다. 별도 프레임워크나
빌드 과정 없이 HTML, CSS, JavaScript만으로 동작합니다.

## 로컬 실행

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 열면 됩니다.

## 파일

- `index.html` — 페이지 구조와 콘텐츠
- `styles.css` — 반응형 레이아웃, 타이포그래피, 모션
- `script.js` — 모바일 메뉴, 스크롤 상태, 등장 모션, 안내 토스트
- `assets/` — 히어로와 거리 이미지의 최적화된 반응형 파생본

## 연락처 연결

현재 제공된 자산에 공식 문의처가 없어 마지막 CTA는 안내 토스트로
구현되어 있습니다. 실제 이메일, 카카오 채널, 문의 폼 URL이 정해지면
`index.html`의 `[data-contact-button]`을 링크로 교체하면 됩니다.
