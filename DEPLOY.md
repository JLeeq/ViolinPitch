# 🚀 Violin Pitch 배포 가이드

## 📋 사전 준비사항

### 1. 도메인 설정
- 도메인: `violinpitch.com`
- DNS A 레코드: EC2 IP 주소(`54.241.44.26`)로 설정
- www 서브도메인도 동일하게 설정

### 2. EC2 보안 그룹 설정
AWS Console에서 EC2 보안 그룹에 다음 인바운드 규칙 추가:
- **HTTP (80)** - 소스: `0.0.0.0/0`
- **HTTPS (443)** - 소스: `0.0.0.0/0` ⚠️ **마이크 권한을 위해 필수!**

### 3. 백엔드가 실행 중인지 확인
```bash
ssh -i /Users/jlee/4-1/Violin/violincoach-key.pem ubuntu@54.241.44.26
sudo systemctl status violincoach-api
```

## 🔧 배포 단계

### 1단계: 로컬에서 배포 스크립트 실행

```bash
cd /Users/jlee/4-1/Violin/violincoachAI
chmod +x deploy.sh
./deploy.sh
```

### 2단계: SSL 인증서 설치 (최초 1회)

⚠️ **HTTPS가 없으면 마이크 권한이 작동하지 않습니다!**

EC2 서버에 접속:
```bash
ssh -i /Users/jlee/4-1/Violin/violincoach-key.pem ubuntu@54.241.44.26
```

Let's Encrypt 설치 및 인증서 발급:
```bash
# Certbot 설치
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (도메인이 EC2를 가리키고 있어야 함)
sudo certbot --nginx -d violinpitch.com -d www.violinpitch.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 3단계: Nginx 설정 적용

```bash
# 설정 파일이 올바른지 확인
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## ✅ 배포 확인

### 1. 웹 브라우저에서 확인
- 데스크톱: `https://violinpitch.com`
- 핸드폰: `https://violinpitch.com`

### 2. HTTPS 확인
- 브라우저 주소창에 🔒 자물쇠 아이콘이 표시되어야 함
- HTTP 접속 시 자동으로 HTTPS로 리다이렉트

### 3. 마이크 권한 테스트
1. Tuner 탭으로 이동
2. 마이크 권한 허용 팝업이 표시되는지 확인
3. 권한 허용 후 피치 감지 작동 확인

### 4. API 엔드포인트 테스트
```bash
curl https://violinpitch.com/api/analysis/sessions
curl https://violinpitch.com/health
```

## 🔍 문제 해결

### 문제 1: 마이크 권한이 작동하지 않음
**원인**: HTTPS가 설정되지 않음

**해결**:
```bash
# SSL 인증서 상태 확인
sudo certbot certificates

# 인증서가 없다면 발급
sudo certbot --nginx -d violinpitch.com -d www.violinpitch.com
```

### 문제 2: SSL 인증서 발급 실패
**원인**: 도메인이 EC2 IP를 가리키지 않음

**해결**:
1. DNS 설정 확인 (A 레코드가 EC2 IP로 설정되어 있는지)
2. DNS 전파 대기 (최대 48시간, 보통 몇 분 내)
3. 80 포트가 열려있는지 확인 (인증서 발급 시 필요)

### 문제 3: 502 Bad Gateway
**원인**: 백엔드 서버가 실행되지 않음

**해결**:
```bash
ssh -i /Users/jlee/4-1/Violin/violincoach-key.pem ubuntu@54.241.44.26
sudo systemctl start violincoach-api
sudo systemctl status violincoach-api
```

### 문제 4: 404 Not Found
**원인**: 프론트엔드 파일이 업로드되지 않음

**해결**:
```bash
# 파일 확인
ssh -i /Users/jlee/4-1/Violin/violincoach-key.pem ubuntu@54.241.44.26 "ls -la /var/www/violinpitch"

# 다시 배포
./deploy.sh
```

## 📱 모바일 마이크 권한

### 요구사항
- ✅ HTTPS 연결 필수
- ✅ 브라우저에서 마이크 권한 허용

### 지원 브라우저
- ✅ Chrome (Android/iOS)
- ✅ Safari (iOS)
- ✅ Firefox Mobile
- ✅ Samsung Internet

### Safari에서 마이크가 작동하지 않는 경우
1. 설정 → Safari → 마이크 → violinpitch.com 허용
2. 또는 Safari 주소창 옆의 "aA" 버튼 → 웹사이트 설정 → 마이크 허용

## 🔄 업데이트 배포

코드 변경 후 재배포:

```bash
# 1. 코드 수정
# 2. 배포 스크립트 실행
./deploy.sh
```

## 📊 모니터링

### 로그 확인

**Nginx 로그**:
```bash
ssh -i /Users/jlee/4-1/Violin/violincoach-key.pem ubuntu@54.241.44.26
sudo tail -f /var/log/nginx/violinpitch_access.log
sudo tail -f /var/log/nginx/violinpitch_error.log
```

**FastAPI 로그**:
```bash
sudo journalctl -u violincoach-api -f
```

### SSL 인증서 갱신

Let's Encrypt 인증서는 90일마다 갱신 필요. Certbot이 자동으로 처리함:
```bash
# 자동 갱신 확인
sudo systemctl status certbot.timer

# 수동 갱신 (필요한 경우)
sudo certbot renew
```

## 🎯 배포 체크리스트

- [ ] DNS A 레코드 설정 (violinpitch.com → EC2 IP)
- [ ] EC2 보안 그룹에 HTTP(80), HTTPS(443) 포트 열기
- [ ] 백엔드 서버 실행 확인
- [ ] `./deploy.sh` 실행
- [ ] SSL 인증서 발급 (`sudo certbot --nginx -d violinpitch.com -d www.violinpitch.com`)
- [ ] HTTPS로 접속 확인
- [ ] 마이크 권한 작동 확인
- [ ] 모바일에서 접속 및 기능 테스트

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. DNS 설정 (도메인 → EC2 IP)
2. SSL 인증서 상태
3. EC2 보안 그룹 (443 포트 열림)
4. 백엔드 서비스 상태
5. Nginx 로그 파일
