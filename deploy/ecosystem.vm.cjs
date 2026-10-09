/**
 * pm2 on the founder's VM (Ubuntu, Node 22 via nvm): the web app on :3400 behind nginx, reading
 * /home/ubuntu/sown/.env.local (never in git). Testnet while the domain is a stand-in:
 * https://sown.80.225.209.190.sslip.io, certificate by certbot. Passkeys made there stay there;
 * mainnet waits for the final domain.
 *
 *   rsync (no node_modules, .next*, target, .git, .keys, .env.local, var) → npm ci → npm run build
 *   → cp deploy/ecosystem.vm.cjs ecosystem.config.cjs → pm2 start ecosystem.config.cjs --only sown
 *   (first time) or pm2 restart sown → pm2 save. pm2 reads a file as a config only by that name:
 *   started as deploy/ecosystem.vm.cjs it runs the file itself as an app (found on 9 Oct).
 */
const NODE_BIN = "/home/ubuntu/.nvm/versions/node/v22.23.2/bin";
module.exports = {
  apps: [
    {
      name: "sown",
      cwd: "/home/ubuntu/sown",
      script: `${NODE_BIN}/npx`,
      args: "next start -p 3400",
      env: { NEXT_DIST_DIR: ".next-build", NODE_ENV: "production", PATH: `${NODE_BIN}:${process.env.PATH}` },
      max_memory_restart: "500M",
    },
  ],
};
