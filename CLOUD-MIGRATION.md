# Cloud-Only Migration (No Docker Desktop)

This project can now deploy fully from cloud services without local Docker.

## What changed

- Deployment scripts build images in Azure Container Registry using `az acr build`.
- Terraform + Azure CLI drive infrastructure and app rollout.
- Local Docker commands are no longer required for cloud deployment.

## Required tools

- Azure CLI (`az`)
- Terraform
- Bash (Git Bash/WSL/macOS shell)

## One-time setup

```bash
az login
az account set --subscription <your-subscription-id>
./scripts/setup-azure.sh
```

## Deploy

```bash
./scripts/deploy.sh
```

## npm shortcuts

```bash
npm run cloud:setup
npm run cloud:deploy
```

## Optional: uninstall Docker Desktop

You can uninstall Docker Desktop after migration if you do not need local container dev/test.

Windows (PowerShell as Administrator):

```powershell
winget uninstall Docker.DockerDesktop
```

Then remove leftover Docker CLI context if desired:

```powershell
Remove-Item "$env:USERPROFILE\\.docker" -Recurse -Force
```

## Notes

- CI can still use Docker for certain test jobs if enabled by pipeline.
- Production deploy/build path is cloud-only and Docker Desktop independent.
