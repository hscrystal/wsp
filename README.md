# gitops-demo

โปรเจคง่ายๆ สำหรับทำความเข้าใจหลักการ **Helm chart + ArgoCD**

## โครงสร้าง

```
├── .github/
│   └── workflows/
│       ├── deploy-dev.yaml     # push -> main: build image + bump values-dev.yaml
│       └── promote-prod.yaml   # push tag v*: build image + bump values-prod.yaml
├── app/                        # แอปตัวอย่าง (Node.js, ตอบ JSON)
│   ├── index.js
│   └── Dockerfile
├── charts/
│   └── hello-app/              # Helm chart
│       ├── Chart.yaml
│       ├── values.yaml         # ค่า default ทุก env
│       ├── values-dev.yaml     # override เฉพาะ dev
│       ├── values-prod.yaml    # override เฉพาะ prod
│       └── templates/
│           ├── _helpers.tpl
│           ├── deployment.yaml
│           ├── service.yaml
│           └── ingress.yaml
└── argocd/
    ├── application-dev.yaml    # ArgoCD Application ชี้ไป dev
    └── application-prod.yaml   # ArgoCD Application ชี้ไป prod
```

## หลักการที่ต้องเข้าใจ

### 1. Helm chart = template + values
- `templates/*.yaml` คือพิมพ์เขียว K8s manifest ที่ยังไม่ fix ค่า (ใช้ `{{ .Values.xxx }}`)
- `values.yaml` คือค่า default
- `values-dev.yaml` / `values-prod.yaml` คือไฟล์ override บางส่วน (ไม่ต้อง copy ทั้งไฟล์ ใส่แค่ค่าที่ต่าง)
- คำสั่ง `helm template` จะ render templates + values รวมกันออกมาเป็น manifest จริง — ลองรันดูได้โดยไม่ต้องมี cluster:

```bash
helm template hello-app charts/hello-app -f charts/hello-app/values.yaml -f charts/hello-app/values-dev.yaml
```

### 2. ArgoCD = ตัวคอย sync Git -> Cluster
- Application manifest (`argocd/application-*.yaml`) บอก ArgoCD ว่า:
  - **source**: ไป pull chart จาก Git repo ไหน path ไหน ใช้ values file ไหน
  - **destination**: deploy ไป cluster/namespace ไหน
  - **syncPolicy**: sync อัตโนมัติไหม (`automated`), ถ้ามีคนแก้ cluster ตรงๆ ให้ดึงกลับตาม Git ไหม (`selfHeal`), ลบของที่ไม่มีใน Git ออกไหม (`prune`)
- หลักการสำคัญคือ **Git คือ source of truth** — ห้าม `kubectl apply` มือ, แก้ที่ Git แล้วปล่อยให้ ArgoCD sync ให้

### 3. ทำไมแยก dev/prod เป็นคนละ Application
- Chart เดียวกัน (`charts/hello-app`) reuse ได้ทุก environment
- ต่างกันแค่ values file + syncPolicy (เช่น prod ปิด auto-prune เพื่อความปลอดภัย)
- นี่คือรูปแบบมาตรฐานของ "environment promotion": โค้ด/chart เดียวกัน ไหลผ่านหลาย env ด้วยการเปลี่ยน values

### 4. แยก Namespace ระหว่าง dev กับ prod
- `argocd/application-dev.yaml` → `destination.namespace: hello-app-dev`
- `argocd/application-prod.yaml` → `destination.namespace: hello-app-prod`
- ทั้งคู่ตั้ง `syncOptions: [CreateNamespace=true]` ไว้แล้ว ArgoCD จะสร้าง namespace ให้อัตโนมัติถ้ายังไม่มี
- resource ทุกตัวใน chart (`deployment.yaml` / `service.yaml` / `ingress.yaml`) ใส่ `namespace: {{ .Release.Namespace }}` ไว้ใน metadata ด้วย — ค่านี้จะถูกกำหนดโดย ArgoCD (จาก `destination.namespace`) หรือโดย flag `--namespace` ตอนใช้ `helm install/template` ตรงๆ ก็ได้
- ผลคือ dev กับ prod ไม่มีทาง apply ไปชนกันใน namespace เดียวกันแม้จะรัน Application ผิดตัว เพราะ resource ทุกตัวผูก namespace ไว้ชัดเจนตั้งแต่ chart แล้ว

### 5. GitHub Actions = ตัว "แก้ Git" อัตโนมัติ (CI ต่อกับ CD)
- ArgoCD ไม่รู้จัก Docker registry, ไม่ build image ให้ — หน้าที่นั้นเป็นของ CI (GitHub Actions)
- Flow: push โค้ด `app/**` เข้า `main` → Actions build image → push ขึ้น **Docker Hub** (`docker.io/<dockerhub-username>/hello-app`) แท็กด้วย commit SHA → **Actions commit แก้ `charts/hello-app/values-dev.yaml`** ให้ `image.tag` ชี้ไป image ใหม่ → push กลับเข้า `main`
- ArgoCD (`automated` sync บน `hello-app-dev`) เห็น Git เปลี่ยนก็ sync ให้เองภายในไม่กี่วินาที — **Actions ไม่เคยยิงเข้า cluster ตรงๆ**, มันแค่แก้ Git แล้วปล่อยให้ ArgoCD ทำงานตามหน้าที่
- Prod แยกออกมาโดยเจตนา: [promote-prod.yaml](.github/workflows/promote-prod.yaml) trigger เฉพาะตอน push git tag รูปแบบ `v*.*.*` (เช่น `git tag v1.0.0 && git push --tags`) ไม่ trigger ทุก commit เหมือน dev — ป้องกันของที่ยังไม่ผ่านการ review ไหลเข้า prod เอง
- commit message ของ bot มี `[skip ci]` กันไม่ให้เกิด infinite loop (bot commit values file → trigger workflow ตัวเอง → commit อีก → ...)
- ทั้งสอง workflow แยก **vulnerability scanning** เป็นคนละ job ต่างหาก ไม่รวมอยู่ใน job build:
  1. `build-image` — build image local (`push: false, load: true`) แล้ว `docker save` เก็บเป็น tarball, อัปโหลดเป็น artifact (เพราะ job ถัดไปรันบน runner คนละตัว, image ใน Docker daemon ของ job เดิมส่งต่อข้าม job ไม่ได้)
  2. `scan-image` — โหลด image จาก artifact กลับมา แล้ว scan ด้วย [Trivy](https://github.com/aquasecurity/trivy-action) หา CVE ระดับ `CRITICAL`/`HIGH` — เจอแล้ว fail ทันที (`exit-code: 1`)
  3. `push-image` — โหลด image จาก artifact อีกครั้ง, login Docker Hub, แล้ว push (`needs: scan-image` การันตีว่าผ่านสแกนแล้วเท่านั้นถึงจะรันได้)
  4. `update-dev-values` / `update-prod-values` — `needs: push-image` แก้ values file แล้ว commit กลับ
  - แยกเป็นคนละ job ทำให้เห็น **"Vulnerability Scan" เป็น status check แยกต่างหาก** ใน GitHub UI ได้ (ตั้งเป็น required check ได้ในอนาคต) แลกกับเวลาที่เพิ่มขึ้นเล็กน้อยจากการ upload/download image tarball ข้าม job
- `ingress.host` และ `externalDns.target` เป็นค่า **static เก็บตรงในไฟล์ values** (`values.yaml`/`values-dev.yaml`/`values-prod.yaml`) ไม่ได้ผ่าน GitHub Actions Variable — แก้ทีหลังต้องแก้ไฟล์แล้ว commit ตรงๆ (เคยลองใช้ GitHub Variable มาก่อน แต่ค่าก็ยังต้องถูก CI bump เข้า git อยู่ดีเพราะ ArgoCD อ่านค่าจาก Git เสมอ เลยตัดสินใจง่ายกว่าให้เก็บตรงในไฟล์ไปเลย)
- **ก่อนใช้งานจริงต้องตั้งค่า**:
  1. สร้าง [Docker Hub Access Token](https://hub.docker.com/settings/security) แล้วเพิ่มเป็น GitHub Secrets ที่ Settings → Secrets and variables → Actions:
     - `DOCKERHUB_USERNAME` — username Docker Hub ของคุณ
     - `DOCKERHUB_TOKEN` — access token (ไม่ใช่รหัสผ่านบัญชี)
  2. Settings → Actions → General → Workflow permissions → เลือก **Read and write permissions** (ให้ `GITHUB_TOKEN` push commit กลับเข้า repo ได้ — เฉพาะขั้นตอน commit values file เท่านั้น ไม่เกี่ยวกับ Docker Hub)
  3. ถ้า branch `main` มี branch protection ต้อง allow bot/Action push ได้ (หรือใช้ PAT แทน `GITHUB_TOKEN` ถ้าต้องผ่าน required review)
  4. แก้ `repoURL` ใน `argocd/application-*.yaml` ให้ตรงกับ GitHub repo จริง และแก้ `image.repository` ใน `values.yaml` เป็น `docker.io/<dockerhub-username>/hello-app`
  5. แก้ `ingress.host` (`values-dev.yaml`/`values-prod.yaml`) และ `ingress.externalDns.target` (`values.yaml`) ให้ตรงกับ domain/tunnel จริงของคุณ

## วิธีลองเล่นแบบไม่ต้องมี cluster จริง

```bash
# ติดตั้ง helm (ถ้ายังไม่มี)
brew install helm

# render manifest ของ dev แล้วดูผลลัพธ์ (ระบุ --namespace ให้ตรงกับที่ ArgoCD ใช้จริง)
helm template hello-app charts/hello-app -f charts/hello-app/values.yaml -f charts/hello-app/values-dev.yaml --namespace hello-app-dev

# render manifest ของ prod เทียบกัน
helm template hello-app charts/hello-app -f charts/hello-app/values.yaml -f charts/hello-app/values-prod.yaml --namespace hello-app-prod

# lint chart หา syntax error
helm lint charts/hello-app
```

## ถ้ามี cluster จริง (เช่น minikube / kind) + ติดตั้ง ArgoCD แล้ว

```bash
# 1. push โปรเจคนี้ขึ้น Git repo ของตัวเอง แล้วแก้ repoURL ใน argocd/application-*.yaml

# 2. apply Application ให้ ArgoCD รู้จัก
kubectl apply -f argocd/application-dev.yaml
kubectl apply -f argocd/application-prod.yaml

# 3. ดูสถานะผ่าน CLI
argocd app get hello-app-dev
argocd app sync hello-app-dev
```

## ลำดับการทดลองที่แนะนำ

1. รัน `helm template` เทียบ dev vs prod ดูว่าค่าไหน override บ้าง — จะเห็นภาพ "1 chart, N environments" ชัดเจน
2. ลองแก้ `values-dev.yaml` เปลี่ยน `replicaCount` หรือ `env.message` แล้ว render ใหม่ดูผลต่าง
3. ถ้ามี cluster: apply Application แล้วลอง `kubectl edit deployment` มือดูว่า ArgoCD (selfHeal) ดึงกลับตาม Git ยังไง — นี่คือหัวใจของ GitOps
4. ถ้ามี GitHub repo จริง: push แก้ `app/index.js` เล่นๆ ดู Actions tab ว่า build image + commit bump tag ให้เองไหม แล้วดู ArgoCD sync ตามหลัง
5. ลอง `git tag v0.1.0 && git push --tags` ดู [promote-prod.yaml](.github/workflows/promote-prod.yaml) ทำงานแยกจาก dev flow
