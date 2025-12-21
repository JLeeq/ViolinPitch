# 마이크 권한 문제 분석

## 문제 상황
- **Tuner 탭**: 마이크 권한이 정상 작동 ✅
- **Record & Analysis 탭**: 마이크 권한이 작동하지 않음 ❌

## 코드 비교 분석

### 1. 호출 타이밍 차이

#### Tuner.jsx
```javascript
useEffect(() => {
  // 컴포넌트 마운트 시 자동으로 마이크 시작
  startListening()
  
  return () => {
    // cleanup
  }
}, [])
```
- **페이지 로드 시 즉시** 마이크 권한 요청
- 브라우저가 자동으로 권한 팝업 표시
- 사용자 상호작용 없이 권한 요청 가능 (일부 브라우저에서)

#### RecordAndAnalysis.jsx
```javascript
// 버튼 클릭 시에만 호출
<button onClick={startRecording}>Start Recording</button>
```
- **사용자가 버튼을 클릭한 후** 마이크 권한 요청
- 사용자 상호작용 후 권한 요청 (권장 방식)
- 하지만 이미 권한이 거부된 상태일 수 있음

### 2. 기능 차이

#### Tuner.jsx
- 단순 오디오 스트림만 사용
- `navigator.mediaDevices.getUserMedia({ audio: true })`
- AudioContext로 실시간 피치 감지

#### RecordAndAnalysis.jsx
- 오디오 스트림 + MediaRecorder 사용
- `navigator.mediaDevices.getUserMedia({ audio: true })`
- `new MediaRecorder(stream)` - 녹음 기능 추가
- AudioContext로 실시간 피치 감지

### 3. 가능한 원인

#### 원인 1: 권한 상태 캐싱
- Tuner에서 이미 마이크 권한을 허용했지만, RecordAndAnalysis에서 다시 요청할 때 문제 발생 가능
- 브라우저가 권한 상태를 캐싱하고 있을 수 있음

#### 원인 2: MediaRecorder 호환성
- MediaRecorder가 일부 브라우저에서 추가 권한이나 설정이 필요할 수 있음
- MediaRecorder 생성 시점에 문제가 발생할 수 있음

#### 원인 3: 스트림 재사용
- Tuner에서 이미 스트림을 사용 중이면, RecordAndAnalysis에서 새 스트림을 요청할 때 충돌 가능

#### 원인 4: 사용자 상호작용 요구사항
- 일부 브라우저는 사용자 상호작용(클릭) 후에만 마이크 권한을 요청할 수 있음
- 하지만 RecordAndAnalysis는 이미 버튼 클릭 후 호출하므로 이건 문제 아님

## 해결 방안

### 방안 1: 권한 상태 확인 후 요청
```javascript
// 권한 상태 확인
const permissionStatus = await navigator.permissions.query({ name: 'microphone' })
if (permissionStatus.state === 'denied') {
  // 권한이 거부된 경우 안내
}
```

### 방안 2: MediaRecorder 생성 전 스트림 확인
```javascript
// 스트림이 활성 상태인지 확인
if (stream.active) {
  const mediaRecorder = new MediaRecorder(stream)
}
```

### 방안 3: 에러 처리 개선
```javascript
catch (err) {
  if (err.name === 'NotAllowedError') {
    // 권한 거부 - 사용자에게 안내
  } else if (err.name === 'NotFoundError') {
    // 마이크 없음
  }
}
```

### 방안 4: Tuner와 동일한 방식으로 변경
- RecordAndAnalysis도 페이지 로드 시 권한 요청 (하지만 녹음은 버튼 클릭 시 시작)

## 권장 해결책

**가장 가능성 높은 원인**: MediaRecorder 생성 시점이나 스트림 상태 문제

**해결 방법**:
1. 스트림이 완전히 준비된 후 MediaRecorder 생성
2. 에러 처리 개선하여 정확한 에러 메시지 표시
3. 권한 상태 확인 로직 추가

