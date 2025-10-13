module.exports = {
  apps: [
    {
      name: "helpdesk-backend",
      cwd: "./helpdesk-backend",
      script: "npm",
      args: "run start",
      env: { NODE_ENV: "production", PORT: "4000" },
      out_file: "/var/log/helpdesk-backend.log",
      error_file: "/var/log/helpdesk-backend.log",
      time: true,
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
}
