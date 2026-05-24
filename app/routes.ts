import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("upload", "routes/upload.tsx"),
  route("upload-lote", "routes/upload-lote.tsx"),
  route("api/decisao", "routes/api.decisao.tsx"),
  route("decisao/:id", "routes/decisao.$id.tsx"),
  route("lixeira", "routes/lixeira.tsx"),
] satisfies RouteConfig;
