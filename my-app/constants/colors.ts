// 피그마 디자인 기준 (Y2K): https://www.figma.com/design/jXKweeUqBSBAFwVjlJaJLq/RootMate-my-app
export const COLORS = {
  // 배경
  bg:           '#FFFFFF',
  cardBg:       '#f3f4f1',
  headerBg:     '#BAFE32',              // 상단 헤더 (라임)

  // 브랜드
  green:        '#286905',              // 날짜·섹션 제목
  lime:         '#BAFE32',              // 라임 액센트 (헤더·버튼·기록일)
  limeLight:    'rgba(186,254,50,0.5)', // 연속 구간 띠·기록 카드 하단 띠
  pine:         '#14532d',              // 캘린더 탭·월 제목, 연속 관리 숫자
  outline:      '#052e16',              // 테두리·아이콘·강조 텍스트 (진초록)
  forest:       '#064e3b',              // 캐릭터 대사·이름

  // 선·탭
  line:         '#7f7f7f',              // 헤더·탭바 구분선, 비활성 탭
  tabActive:    '#7ab10b',              // 활성 탭 (아이콘·라벨)
  tabInactive:  '#7f7f7f',
  tabTextOff:   '#c5c7c0',              // 비활성 상단 탭(캘린더/앨범) 글자

  // 텍스트
  textPrimary:  '#052e16',
  textDark:     '#052e16',
  textGreen:    '#286905',
  textTertiary: '#ADADAD',
  textSecondary: '#5b5b5b',

  // 상태
  red:          '#ff6565',              // 취소·에러
  weekend:      '#ff6b49',              // 캘린더 일·토 요일 헤더

  // 테두리·강조 (코드에 직접 쓰던 값을 이름 붙임)
  borderDark:   '#303a1e',              // 버튼·팝업·선택지·채팅 말풍선/아바타·체크박스 테두리, 라임 버튼 위 글자·아이콘 (옛 #2a2a2a 말풍선 테두리도 이 값으로 통일)
  redStrong:    '#d93025',              // 진한 빨강: 나가기·위험 버튼, 개발자 메뉴 경고, 도감 토마토 색

  // 글자·아이콘 중간 톤
  textBubble:   '#424343',              // 말풍선·선택지·체크 항목 글자
  textInk:      '#191c1b',              // 날짜·요일·기록 카드 글자, 보내기 화살표·뒤로가기 화살표 (옛 #1d1b20, #41493b 포함)

  // 그림자·보조 바탕
  shadow:       '#101828',              // 카드·말풍선·입력창 그림자 색
  gradEnd:      '#e2e2e2',              // 선택지 버튼 그라디언트 끝색 (시작은 cardBg #f3f4f1)
  imageBg:      '#e0e0e0',              // 앨범·기록 카드 사진 자리 바탕

  // 입력 필드 전용
  inputBg:      '#FFFFFF',
  inputBorder:  '#7f7f7f',
  inputBorderFocus: '#14532d',
  inputBorderError: '#ff6565',

  // 버튼
  btnDisabledBg:   '#E8E4DF',
  btnDisabledText: '#ADADAD',

  // 캘린더
  calendarDot:     '#3e98ff',
  prevMonthText:   '#b7b7b7',
  waterBadge:      '#62d8ff',
};
