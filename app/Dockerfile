# pin ทั้งเวอร์ชันและ digest เพื่อให้ build ซ้ำได้ image เดิมเสมอ (tag อย่าง alpine3.24 ถูกชี้ไป image ใหม่ได้ตลอด)
# อัปเดต base image = แก้บรรทัดนี้แล้ว commit ให้ Trivy สแกนใหม่
FROM node:26.10.0-alpine3.24@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80
WORKDIR /app
COPY index.js .

RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack

EXPOSE 8080
CMD ["node", "index.js"]
