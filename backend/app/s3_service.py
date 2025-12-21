import boto3
import os
from botocore.exceptions import ClientError
from typing import Optional

class S3Service:
    def __init__(self):
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "violincoach-audio-files")
        aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        region_name = os.getenv("AWS_REGION", "us-west-1")
        
        # AWS 자격 증명이 제공된 경우에만 클라이언트 생성
        if aws_access_key_id and aws_secret_access_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=region_name
            )
        else:
            # 환경 변수가 없으면 기본 자격 증명 사용 (EC2 IAM 역할 등)
            self.s3_client = boto3.client('s3', region_name=region_name)
    
    def upload_audio_file(self, file_path: str, s3_key: str) -> Optional[str]:
        """
        오디오 파일을 S3에 업로드
        
        Args:
            file_path: 로컬 파일 경로
            s3_key: S3에 저장될 키 (예: "user/123/recording_123456.wav")
        
        Returns:
            S3 URL 또는 None (실패 시)
        """
        try:
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                s3_key,
                ExtraArgs={'ContentType': 'audio/wav'}
            )
            
            # S3 URL 반환
            region = os.getenv("AWS_REGION", "us-west-1")
            url = f"https://{self.bucket_name}.s3.{region}.amazonaws.com/{s3_key}"
            return url
        except ClientError as e:
            print(f"Error uploading file to S3: {e}")
            return None
    
    def upload_fileobj(self, file_obj, s3_key: str, content_type: str = 'audio/wav') -> Optional[str]:
        """
        파일 객체를 S3에 업로드 (메모리에서 직접)
        
        Args:
            file_obj: 파일 객체 (BytesIO 등)
            s3_key: S3에 저장될 키
            content_type: MIME 타입
        
        Returns:
            S3 URL 또는 None
        """
        try:
            file_obj.seek(0)  # 파일 포인터를 처음으로
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs={'ContentType': content_type}
            )
            
            region = os.getenv("AWS_REGION", "us-west-1")
            url = f"https://{self.bucket_name}.s3.{region}.amazonaws.com/{s3_key}"
            return url
        except ClientError as e:
            print(f"Error uploading fileobj to S3: {e}")
            return None

# 싱글톤 인스턴스
s3_service = S3Service()

