# Systemd 서비스 설정 가이드

FastAPI를 systemd 서비스로 등록하여 백그라운드에서 자동 실행되도록 설정합니다.

## 1. 가상환경 생성 (권장)

```bash
cd ~/app/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 2. 서비스 파일 복사

```bash
# 서비스 파일을 systemd에 복사
sudo cp systemd/violincoach-api.service /etc/systemd/system/

# 또는 직접 생성
sudo nano /etc/systemd/system/violincoach-api.service
```

## 3. 서비스 파일 수정

실제 환경에 맞게 경로 수정:

```bash
sudo nano /etc/systemd/system/violincoach-api.service
```

수정할 항목:
- `User`: EC2 사용자명 (ubuntu 또는 ec2-user)
- `Group`: www-data 또는 nginx
- `WorkingDirectory`: 실제 백엔드 경로
- `Environment PATH`: 가상환경 경로
- `ExecStart`: uvicorn 실행 경로

**Amazon Linux 2 예시:**
```ini
User=ec2-user
Group=nginx
WorkingDirectory=/home/ec2-user/app/backend
Environment="PATH=/home/ec2-user/app/backend/venv/bin"
ExecStart=/home/ec2-user/app/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## 4. 서비스 활성화 및 시작

```bash
# systemd 데몬 리로드
sudo systemctl daemon-reload

# 서비스 활성화 (부팅 시 자동 시작)
sudo systemctl enable violincoach-api

# 서비스 시작
sudo systemctl start violincoach-api

# 상태 확인
sudo systemctl status violincoach-api
```

## 5. 서비스 관리 명령어

```bash
# 서비스 시작
sudo systemctl start violincoach-api

# 서비스 중지
sudo systemctl stop violincoach-api

# 서비스 재시작
sudo systemctl restart violincoach-api

# 상태 확인
sudo systemctl status violincoach-api

# 로그 확인
sudo journalctl -u violincoach-api -f

# 최근 로그 (100줄)
sudo journalctl -u violincoach-api -n 100
```

## 6. 환경 변수 설정

`.env` 파일이 자동으로 로드되지만, systemd에서 환경 변수를 직접 설정할 수도 있습니다:

```ini
[Service]
Environment="DATABASE_URL=postgresql://..."
Environment="AWS_ACCESS_KEY_ID=..."
Environment="AWS_SECRET_ACCESS_KEY=..."
```

또는 환경 파일 사용:

```ini
[Service]
EnvironmentFile=/home/ubuntu/app/backend/.env
```

## 7. 문제 해결

### 서비스가 시작되지 않는 경우

```bash
# 상세 로그 확인
sudo journalctl -u violincoach-api -n 50 --no-pager

# 서비스 파일 문법 확인
sudo systemd-analyze verify /etc/systemd/system/violincoach-api.service

# 수동 실행 테스트
cd /home/ubuntu/app/backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 권한 문제

```bash
# 파일 소유권 확인
ls -la /home/ubuntu/app/backend

# 필요시 소유권 변경
sudo chown -R ubuntu:www-data /home/ubuntu/app/backend
```

### 포트 충돌

```bash
# 포트 8000 사용 중인 프로세스 확인
sudo lsof -i :8000

# 프로세스 종료
sudo kill -9 <PID>
```

## 8. 자동 재시작 설정

서비스 파일에 이미 `Restart=always`가 설정되어 있어, 프로세스가 종료되면 자동으로 재시작됩니다.

재시작 지연 시간은 `RestartSec=10` (10초)로 설정되어 있습니다.

