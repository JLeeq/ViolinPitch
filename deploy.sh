#!/bin/bash

# Violin Pitch 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 설정
EC2_USER="ubuntu"
EC2_HOST="54.241.44.26"
EC2_KEY="/Users/jlee/4-1/Violin/violincoach-key.pem"
FRONTEND_DIR="dist"
REMOTE_DIR="/var/www/violinpitch"
DOMAIN="violinpitch.com"

echo -e "${GREEN}=== Violin Pitch 배포 시작 ===${NC}\n"

# 1. 프론트엔드 빌드
echo -e "${YELLOW}[1/6] 프론트엔드 빌드 중...${NC}"
if ! npm run build; then
    echo -e "${RED}빌드 실패!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 빌드 완료${NC}\n"

# 2. 빌드 파일 확인
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}빌드 디렉토리($FRONTEND_DIR)를 찾을 수 없습니다!${NC}"
    exit 1
fi

# 3. EC2 연결 테스트
echo -e "${YELLOW}[2/6] EC2 서버 연결 확인 중...${NC}"
if ! ssh -i "$EC2_KEY" -o ConnectTimeout=5 "$EC2_USER@$EC2_HOST" "echo 'Connected'" > /dev/null 2>&1; then
    echo -e "${RED}EC2 서버에 연결할 수 없습니다!${NC}"
    echo -e "${YELLOW}SSH 키 경로와 EC2 IP를 확인해주세요.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 서버 연결 확인${NC}\n"

# 4. 원격 디렉토리 생성
echo -e "${YELLOW}[3/6] 원격 디렉토리 생성 중...${NC}"
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "sudo mkdir -p $REMOTE_DIR && sudo chown -R $EC2_USER:$EC2_USER $REMOTE_DIR"
echo -e "${GREEN}✓ 디렉토리 생성 완료${NC}\n"

# 5. 파일 업로드
echo -e "${YELLOW}[4/6] 파일 업로드 중...${NC}"
rsync -avz --delete -e "ssh -i $EC2_KEY" "$FRONTEND_DIR/" "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"
echo -e "${GREEN}✓ 파일 업로드 완료${NC}\n"

# 6. Nginx 설정 파일 업로드
echo -e "${YELLOW}[5/6] Nginx 설정 파일 업로드 중...${NC}"
scp -i "$EC2_KEY" "backend/nginx/violinpitch.conf" "$EC2_USER@$EC2_HOST:/tmp/violinpitch.conf"
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "sudo mv /tmp/violinpitch.conf /etc/nginx/sites-available/violinpitch && sudo ln -sf /etc/nginx/sites-available/violinpitch /etc/nginx/sites-enabled/"
echo -e "${GREEN}✓ Nginx 설정 파일 업로드 완료${NC}\n"

# 7. Nginx 설정 확인 및 재시작
echo -e "${YELLOW}[6/6] Nginx 설정 확인 중...${NC}"
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
    # Nginx 설정 테스트
    if sudo nginx -t; then
        sudo systemctl restart nginx
        echo "✓ Nginx 재시작 완료"
    else
        echo "Nginx 설정 오류!"
        exit 1
    fi
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx 재시작 완료${NC}\n"
else
    echo -e "${RED}Nginx 설정에 문제가 있습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}=== 배포 완료! ===${NC}"
echo -e "${GREEN}웹사이트 주소: https://$DOMAIN${NC}"
echo -e "${YELLOW}※ HTTPS 설정이 완료되어야 마이크 권한이 작동합니다.${NC}"
echo -e "${YELLOW}※ SSL 인증서가 없다면 아래 명령어를 EC2에서 실행하세요:${NC}"
echo -e "${YELLOW}   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
