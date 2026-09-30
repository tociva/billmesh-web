# Billmesh Web

Nx monorepo for the Billmesh Console and Billmesh Admin Angular applications.

## Development

```bash
pnpm install
pnpm start:console
pnpm start:admin
```

For the local HTTPS setup below, run the API on port `5001`, Console on port
`5200`, and Admin on port `5201`. Both web applications call the API-origin
BFF at `https://api-local.billme.sh` with credentialed browser requests.

## Local HTTPS with Nginx

The applications can be opened through a developer-managed Nginx reverse
proxy, using the same local HTTPS convention as Daybook:

| Application | HTTPS URL                         | Local upstream          |
| ----------- | --------------------------------- | ----------------------- |
| Console     | `https://console-local.billme.sh` | `http://127.0.0.1:5200` |
| Admin       | `https://admin-local.billme.sh`   | `http://127.0.0.1:5201` |
| API         | `https://api-local.billme.sh`     | `http://127.0.0.1:5001` |

The proposed Console and Admin server blocks are in [`docs/nginx`](docs/nginx).
The API server block is in the sibling `billmesh` repository. These files are
examples only: this repository does not install Nginx, create certificates,
edit `/etc/hosts`, copy files outside the repository, or reload Nginx.

The examples below assume Homebrew on Apple Silicon, where Nginx uses
`/opt/homebrew/etc/nginx`. If `brew --prefix` prints another prefix, update the
certificate paths in both proposed configurations before installing them.

1. Install Nginx and `mkcert`, then install the local development CA into this
   workstation's trust stores:

   ```bash
   brew install nginx mkcert
   mkcert -install
   ```

2. Create one wildcard certificate covering the Billmesh local subdomains.
   Keep the certificate and private key outside the repositories:

   ```bash
   NGINX_ROOT="$(brew --prefix)/etc/nginx"
   mkdir -p "$NGINX_ROOT/ssl"
   mkcert \
     -cert-file "$NGINX_ROOT/ssl/local.billme.sh.pem" \
     -key-file "$NGINX_ROOT/ssl/local.billme.sh-key.pem" \
     "*.billme.sh"
   chmod 600 "$NGINX_ROOT/ssl/local.billme.sh-key.pem"
   ```

3. Add this entry to `/etc/hosts` once:

   ```text
   127.0.0.1 api-local.billme.sh console-local.billme.sh admin-local.billme.sh
   ```

4. Install the proposed web server blocks:

   ```bash
   NGINX_ROOT="$(brew --prefix)/etc/nginx"
   mkdir -p "$NGINX_ROOT/servers"
   cp docs/nginx/console-local.billme.sh.conf.example \
     "$NGINX_ROOT/servers/console-local.billme.sh.conf"
   cp docs/nginx/admin-local.billme.sh.conf.example \
     "$NGINX_ROOT/servers/admin-local.billme.sh.conf"
   ```

   Ensure the `http` block in `$NGINX_ROOT/nginx.conf` contains
   `include servers/*;`. Also copy the API server block from
   `../billmesh/docs/nginx/api-local.billme.sh.conf.example`; browser
   authentication and API traffic both use that origin.

5. Start the API, Console, and Admin from their repositories. Then validate and
   reload the developer-managed proxy:

   ```bash
   pnpm start:console -- --port 5200
   pnpm start:admin -- --port 5201
   nginx -t
   brew services restart nginx
   ```

   Run each long-lived application command in its own terminal. Open the
   Console and Admin using the HTTPS URLs in the table, not their direct HTTP
   ports. The Angular development servers do not proxy API traffic.

For cookie-based BFF authentication, register the realm-specific callbacks on
the API origin. Console uses `/api/v1/auth/console/*`; Admin uses
`/api/v1/auth/admin/*`. The API permits credentialed CORS only from the exact
configured Console and Admin application origins.

## Architecture

- Standalone Angular applications
- NgRx Signal Store for shared and feature state
- TailNG is the only UI component system
- Browser authentication uses opaque BFF sessions backed by IdNest OAuth
- OAuth access and refresh tokens never enter browser code

Runtime configuration is loaded from `/config/config.json`. The checked-in
files contain safe local defaults only; deployments replace them with public
environment-specific values. OAuth client secrets remain in the BFF.
