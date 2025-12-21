# GitHub Actions CI/CD 설정 가이드

## 설정 방법

### 1. GitHub Secrets 설정

GitHub 저장소의 Settings → Secrets and variables → Actions에서 다음 secrets를 추가하세요:

1. **EC2_SSH_KEY**: EC2 접속용 SSH 개인 키
   ```bash
   # 로컬에서 키 파일 내용 복사
   cat /Users/jlee/4-1/Violin/violincoach-key.pem
   ```
   전체 내용을 복사하여 `EC2_SSH_KEY` secret에 추가

2. **EC2_HOST**: EC2 서버 IP 주소
   ```
   54.241.44.26
   ```

3. **EC2_USER**: EC2 사용자 이름
   ```
   ubuntu
   ```

### 2. GitHub 저장소에 푸시

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

### 3. 자동 배포 확인

- `main` 또는 `master` 브랜치에 푸시하면 자동으로 배포가 시작됩니다
- GitHub Actions 탭에서 배포 진행 상황을 확인할 수 있습니다

## 수동 배포

GitHub Actions 탭에서 "Run workflow" 버튼을 클릭하여 수동으로 배포할 수 있습니다.

## 주의사항

- SSH 키는 절대 공개 저장소에 커밋하지 마세요
- Secrets는 GitHub 저장소 설정에서만 관리하세요
- EC2 보안 그룹에서 GitHub Actions IP를 허용해야 할 수 있습니다 (또는 0.0.0.0/0 허용)

