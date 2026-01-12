import re

filepath = '/etc/nginx/sites-enabled/00-hms.nexa.net.id.conf.broken'
output_path = '/etc/nginx/sites-enabled/00-hms.nexa.net.id.conf'

with open(filepath, 'r') as f:
    content = f.read()

# Find the location /api/ block and add client_max_body_size inside it
pattern = r'(location /api/ \{)'
replacement = r'\1\n        client_max_body_size 100M;'

# Remove any standalone client_max_body_size that was added incorrectly
content = re.sub(r'^\s*client_max_body_size.*?;\s*$', '', content, flags=re.MULTILINE)

# Now add it properly inside the location block
content = re.sub(pattern, replacement, content)

with open(output_path, 'w') as f:
    f.write(content)

print("SUCCESS: Nginx config repaired with upload limit inside location block")
