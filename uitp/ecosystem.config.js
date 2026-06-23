module.exports = {
  apps: [
    {
      name: 'uitp-backend',
      script: 'dist/index.js',
      cwd: '/home/ec2-user/docker-ui/uitp/backend',
      env_file: '/home/ec2-user/docker-ui/uitp/backend/.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/tmp/uitp-backend-err.log',
      out_file:   '/tmp/uitp-backend-out.log',
    },
    {
      name: 'uitp-frontend',
      script: 'serve',
      args: '-s dist -l 3000',
      cwd: '/home/ec2-user/docker-ui/uitp/frontend',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      error_file: '/tmp/uitp-frontend-err.log',
      out_file:   '/tmp/uitp-frontend-out.log',
    },
  ],
};
