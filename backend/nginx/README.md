# Nginx Reverse Proxy 설정 가이드

## 1. Nginx 설치

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# Amazon Linux 2
sudo yum install nginx -y
```

## 2. 설정 파일 복사

```bash
# 설정 파일을 Nginx sites-available에 복사
sudo cp nginx/violincoach.conf /etc/nginx/sites-available/violincoach

# 또는 직접 생성
sudo nano /etc/nginx/sites-available/violincoach
# 파일 내용 복사/붙여넣기
```

## 3. 도메인 설정 (선택사항)

도메인이 있다면 설정 파일에서 `server_name` 수정:

```bash
sudo nano /etc/nginx/sites-available/violincoach
# server_name _; → server_name api.violincoach.com;
```

## 4. 설정 활성화

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/violincoach /etc/nginx/sites-enabled/

# 기본 설정 비활성화 (선택사항)
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t
```

## 5. Nginx 재시작

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx  # 부팅 시 자동 시작
```

## 6. 방화벽 설정

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 또는 EC2 Security Group에서:
# - Inbound: HTTP (80), HTTPS (443) 허용
# - FastAPI 포트 (8000)는 외부에서 직접 접근 불필요 (Nginx가 프록시)
```

## 7. FastAPI 서버 실행

```bash
cd ~/app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**중요**: `--host 127.0.0.1`로 설정하여 로컬에서만 접근 가능하게 함 (Nginx를 통해서만 접근)

## 8. 테스트

```bash
# Health check
curl http://localhost/health

# 또는 EC2 외부 IP로
curl http://YOUR_EC2_IP/health

# API 엔드포인트
curl http://YOUR_EC2_IP/api/analysis/sessions
```

## 9. HTTPS 설정 (Let's Encrypt - 선택사항)

### Certbot 설치

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# Amazon Linux 2
sudo yum install certbot python3-certbot-nginx -y
```

### 인증서 발급

```bash
sudo certbot --nginx -d api.violincoach.com
```

인증서 발급 후 설정 파일의 HTTPS 부분 주석 해제:

```bash
sudo nano /etc/nginx/sites-available/violincoach
# HTTPS server 블록 주석 해제 및 도메인 수정
sudo nginx -t
sudo systemctl reload nginx
```

### 자동 갱신 설정

```bash
# 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신은 systemd timer로 이미 설정됨
```

## 10. Systemd 서비스로 FastAPI 실행 (프로덕션)

### 서비스 파일 생성

```bash
sudo nano /etc/systemd/system/violincoach-api.service
```

다음 내용 추가:

```ini
[Unit]
Description=Violin Coach AI FastAPI Application
After=network.target

[Service]
User=ubuntu  # 또는 ec2-user (Amazon Linux)
Group=www-data  # 또는 nginx
WorkingDirectory=/home/ubuntu/app/backend  # 실제 경로로 변경
Environment="PATH=/home/ubuntu/app/backend/venv/bin"  # 가상환경 경로
ExecStart=/home/ubuntu/app/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 서비스 활성화

```bash
sudo systemctl daemon-reload
sudo systemctl enable violincoach-api
sudo systemctl start violincoach-api
sudo systemctl status violincoach-api
```

## 11. 로그 확인

```bash
# Nginx 로그
sudo tail -f /var/log/nginx/violincoach_access.log
sudo tail -f /var/log/nginx/violincoach_error.log

# FastAPI 로그 (systemd 사용 시)
sudo journalctl -u violincoach-api -f
```

## 12. 문제 해결

### Nginx 설정 테스트
```bash
sudo nginx -t
```

### Nginx 재시작
```bash
sudo systemctl restart nginx
```

### 포트 확인
```bash
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :8000
```

### FastAPI가 실행 중인지 확인
```bash
curl http://127.0.0.1:8000/health
```

## 주의사항

1. **보안 그룹**: EC2 Security Group에서 포트 80, 443만 열고 8000은 닫아야 함
2. **방화벽**: 로컬 방화벽도 확인
3. **도메인**: 도메인을 사용한다면 DNS A 레코드 설정 필요
4. **HTTPS**: 프로덕션에서는 반드시 HTTPS 사용 권장

