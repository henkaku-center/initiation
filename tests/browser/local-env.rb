# ABOUTME: Pass only a disposable local Supabase configuration to browser verification commands.
# ABOUTME: Keep credentials out of logs and refuse application directories containing env overrides.
require 'json'
require 'open3'
require 'securerandom'

service_dir, app_dir, *command = ARGV
abort 'Usage: ruby local-env.rb <test-service-dir> <isolated-app-dir> <command> [args...]' unless app_dir && !command.empty?
overrides = Dir.glob(File.join(app_dir, '.env*')).reject { |path| File.basename(path) == '.env.example' }
abort 'Use an isolated app directory without env overrides' unless overrides.empty?
cli = ENV.fetch('PORTAL_SUPABASE_CLI', 'supabase')
raw, _, status = Open3.capture3(cli, 'status', '--workdir', service_dir, '-o', 'json')
abort 'Disposable Supabase is not running' unless status.success?
settings = JSON.parse(raw)
url = settings.fetch('API_URL')
abort 'Refusing an endpoint outside the disposable test project' unless url == 'http://127.0.0.1:65421'
password_file = File.join(service_dir, 'portal-test-session-password')
unless File.exist?(password_file)
  File.write(password_file, SecureRandom.hex(32), mode: 'w', perm: 0600)
end
environment = {
  'PATH' => ENV.fetch('PATH'), 'HOME' => ENV.fetch('HOME'),
  'TMPDIR' => ENV.fetch('TMPDIR', '/tmp'), 'LANG' => 'en_US.UTF-8',
  'NEXT_TELEMETRY_DISABLED' => '1',
  'SUPABASE_URL' => url, 'SUPABASE_SERVICE_ROLE_KEY' => settings.fetch('SERVICE_ROLE_KEY'),
  'SESSION_PASSWORD' => File.read(password_file),
  'SIWE_ALLOWED_DOMAINS' => '127.0.0.1:3102,localhost:3102',
  'ADMIN_ADDRESSES' => '0x2222222222222222222222222222222222222222',
}
exec(environment, *command, chdir: app_dir, unsetenv_others: true)
