module.exports = {
  apps: [
    {
      name: 'bitboostx',
      script: './dist/main.js', // 빌드된 엔트리 파일 경로
      instances: 1, // 인스턴스 수: 1 (fork 모드)
      exec_mode: 'fork', // 실행 모드: fork 또는 cluster
      watch: false, // 코드 변경 감지 여부
      env: {
        NODE_ENV: 'development', // 개발 환경 변수
      },
      env_production: {
        NODE_ENV: 'production', // 프로덕션 환경 변수
      },
    },
  ],
};
