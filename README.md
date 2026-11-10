# Flower Shop Web App

React 19 · TypeScript · Vite · Mantine 8 · TanStack Query · React Router 7

Một ứng dụng phục vụ hai nhóm người dùng, chia theo loại tài khoản và permission trong JWT:

| Ai                          | Đường dẫn                  | Chức năng                                                                                                  |
| --------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Khách vãng lai              | `/`, `/flowers/:id`        | Xem hoa, lọc theo loại, tìm theo tên, xem còn hàng                                                         |
| Khách hàng                  | `/checkout`, `/account/**` | Giỏ hàng, đặt đơn (chọn địa chỉ, ngày, khung giờ, lời nhắn thiệp), hồ sơ, sổ địa chỉ, đơn của tôi, hủy đơn |
| Nhân viên / quản lý / admin | `/admin/**`                | Tổng quan, xử lý đơn theo state machine, danh mục hoa, tồn kho theo lô, khách hàng, nhân viên & phân quyền |

## Chạy ở máy

Cần **Node 22** (`.nvmrc`). Backend phải chạy sẵn (`../run-local.sh`), gateway ở `localhost:8080`.

```bash
nvm use            # đọc .nvmrc -> Node 22
npm ci
npm run dev        # http://localhost:5173  (Vite chuyển /api sang gateway :8080)
```

Gateway ở chỗ khác: `GATEWAY_URL=http://host:8080 npm run dev`.

Tài khoản thử ở profile `local`: `admin` / `FlowerShop2026` (lần đầu bị buộc đổi mật khẩu). Khách tự đăng ký ở `/register`.

| Lệnh                | Việc                                               |
| ------------------- | -------------------------------------------------- |
| `npm run lint`      | ESLint (gồm luật React Hooks)                      |
| `npm run typecheck` | TypeScript strict                                  |
| `npm test`          | Vitest + Testing Library + MSW (không cần backend) |
| `npm run build`     | Build production vào `dist/`                       |

## Build & chạy bằng Docker

```bash
docker build -t flower-shop-web-app:local .
docker run --rm -p 3000:8080 -e GATEWAY_URL=http://host.docker.internal:8080 flower-shop-web-app:local
```

Image gồm nginx (user không phải root, cổng 8080) phục vụ file tĩnh và chuyển `/api/` sang `GATEWAY_URL`.
Trong `../docker-compose.app.yml`, web-app chạy ở http://localhost:3000.

## Cấu trúc

```
src/
├── app/          router, providers, theme, layout (cửa hàng / quản trị), guard route
├── shared/
│   ├── api/      client fetch, ApiError, session (token), kiểu ApiResponse/PageResponse
│   ├── lib/      định dạng tiền/ngày (giờ VN), nhãn tiếng Việt cho enum, xử lý lỗi form, luật validate
│   └── ui/       PageHeader, QueryState, PageBar, OrderStatusBadge, FlowerThumb, confirmAction...
└── features/     mỗi nghiệp vụ một thư mục: api.ts + trang + component
    auth · catalog · cart · checkout · account · orders · inventory · customers · users · admin
```

Quy ước: mỗi `features/*/api.ts` khai báo kiểu dữ liệu khớp DTO backend và hàm gọi API; trang dùng TanStack Query (`useQuery` / `useMutation`). Trang quản trị được tách bundle riêng (lazy), khách xem cửa hàng không phải tải code admin.

## Quyết định bảo mật & nghiệp vụ

| Quyết định                                                                                                                                                       | Ở đâu                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Trình duyệt chỉ gọi **cùng origin**: Vite proxy (dev) / nginx (prod) chuyển `/api` sang gateway. Không cần mở CORS ở gateway                                     | `vite.config.ts`, `nginx.conf`                     |
| Access token chỉ nằm trong bộ nhớ; refresh token trong `sessionStorage` (mất khi đóng tab), không dùng `localStorage`                                            | `shared/api/session.ts`                            |
| Làm mới token **single-flight**: nhiều request cùng gặp 401 chỉ gọi `/auth/refresh` một lần (gọi song song sẽ bị backend coi là dùng lại token và thu hồi phiên) | `shared/api/client.ts`, test `client.test.ts`      |
| Tự đăng xuất sau **15 phút không thao tác**, báo trước 60 giây; đăng xuất luôn thu hồi refresh token ở server                                                    | `features/auth/IdleWatcher.tsx`                    |
| `passwordChangeRequired` → mọi trang bị chặn, buộc đổi mật khẩu rồi đăng nhập lại                                                                                | `app/guards.tsx`, `features/auth/pages.tsx`        |
| Menu/route/nút theo **permission** trong `/auth/me`, không theo tên role. Chỉ để giao diện gọn: backend vẫn kiểm tra lại mọi API                                 | `app/layouts/AdminLayout.tsx`, `RequireAuth`       |
| Chống open redirect: `?next=` chỉ nhận đường dẫn nội bộ                                                                                                          | `safeNext` trong `features/auth/pages.tsx`         |
| Đặt đơn gửi **Idempotency-Key**: bấm lại / mạng chập chờn / F5 dùng lại key cũ → không ra đơn trùng; đổi nội dung đơn → key mới (tránh `ORD-422-001`)            | `features/checkout/rules.ts`, test `rules.test.ts` |
| Request đặt đơn không có giá; giỏ hàng chỉ hiển thị "tạm tính", tổng chính thức lấy từ server                                                                    | `CartProvider`, `CheckoutPage`                     |
| Sửa dữ liệu luôn gửi `version` vừa đọc; bị `COM-409-001` thì báo "người khác vừa sửa" và tải lại                                                                 | `CustomerProfileForm`, `AdminFlowersPage`          |
| Lỗi validate của backend (`COM-400-001`) hiện đúng ô trong form; lỗi khác hiện toast kèm **mã lỗi + mã tra cứu (correlationId)**                                 | `shared/lib/errors.tsx`                            |
| Mọi request gửi `X-Correlation-Id` để nối log trình duyệt → gateway → service                                                                                    | `shared/api/client.ts`                             |
| Không tự thử lại thao tác ghi (mutation); query chỉ thử lại lỗi mạng/5xx                                                                                         | `app/providers.tsx`                                |
| Mật khẩu tạm của nhân viên hiện **một lần**, có nút chép, không lưu ở đâu                                                                                        | `features/users/UsersPage.tsx`                     |
| Khung giờ giao tính theo **giờ Việt Nam** dù máy người dùng ở múi giờ khác: bắt đầu sau ≥ 2 tiếng, tối đa 7 ngày                                                 | `features/checkout/rules.ts`                       |
| Tìm khách theo SĐT là so khớp chính xác (backend cố ý không cho tìm gần đúng để chống dò dữ liệu)                                                                | `AdminCustomersPage`                               |
| Font tự host (`@fontsource`), không tải từ Google → CSP chặt `default-src 'self'`                                                                                | `main.tsx`, `nginx.conf`                           |
| nginx: CSP, `X-Frame-Options DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; file có hash cache 1 năm, `index.html` không cache                       | `nginx.conf`                                       |
| Không xuất source map ở bản production                                                                                                                           | `vite.config.ts`                                   |

## Giới hạn hiện tại (do backend)

- `GET /api/v1/flowers` chỉ trả hoa đang bán và chưa có tìm kiếm/lọc → cửa hàng tải 100 hoa/lần rồi lọc ở trình duyệt; trang quản trị không liệt kê được hoa đã ngừng bán.
- `GET /api/v1/inventory/lots` bắt buộc `sku` → màn Tồn kho bắt đầu bằng chọn hoa.
- Chưa có ảnh hoa → dùng ô màu + biểu tượng theo loại hoa.
- Lịch sử trạng thái đơn ghi `actor` là id tài khoản (UUID), chưa có tên hiển thị.

## Hướng nâng cấp

- BFF + refresh token trong cookie `HttpOnly; Secure; SameSite=Strict` (an toàn hơn `sessionStorage` trước XSS).
- Thêm API tìm kiếm/lọc hoa, ảnh hoa (object storage), thống kê cho trang tổng quan.
- Test E2E (Playwright) chạy trong CI với `docker-compose.app.yml`.

## Release

Giống các service: PR `dev → production` chạy `ci / build`, `only-from-dev`, `release-check / release` (build thử image). Merge thì push `ghcr.io/flower-shop-teddy/flower-shop-web-app:X.Y.Z`, tag `vX.Y.Z`.
Version lấy từ `package.json`; sau mỗi lần release tăng version trên `dev`:

```bash
npm version minor --no-git-tag-version   # 0.1.0 -> 0.2.0
git commit -am "build: bắt đầu phát triển 0.2.0"
```
