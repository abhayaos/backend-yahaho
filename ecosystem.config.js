module.exports = {
  apps: [{
    name: 'yaha-ho-backend',
    script: './server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster', // Use cluster mode for better performance
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Auto-restart if the app crashes
    restart_delay: 1000,
    // Maximum number of restarts
    max_restarts: 10,
    // Enable error and output logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    // Time to wait before restarting the app if it crashes
    kill_timeout: 5000,
    // Maximum time for the app to stay alive during reload
    wait_ready: true,
    listen_timeout: 10000,
    // Watch files for auto-restart (in development)
    watch: false,
    // Ignore these files/directories from watching
    ignore_watch: ['node_modules', 'logs'],
    // Maximum size of the log file
    max_memory_restart: '1G',
    // Node.js arguments
    node_args: '--max-old-space-size=4096',
    // Time to wait after a graceful stop
    min_uptime: '10s',
    // Minimum time between restarts
    min_restart_time: '10s'
  }]
};