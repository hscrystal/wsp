FROM node:alpine3.24
WORKDIR /app
COPY index.js .

# แอปนี้ไม่มี dependency และไม่เรียก npm ตอน runtime — ลบทิ้งเพื่อตัด CVE
# ที่ยังไม่มี patch จาก upstream ออกจาก attack surface ไปเลย
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack

EXPOSE 8080
CMD ["node", "index.js"]
