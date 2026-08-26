import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
const getCatalog = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("03f4f62b2b60454939f046704d8431111b2906942e7258e9aed68dec14f8d564"));
const getMyRenders = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("414e9b8c74e988c541fc85629fa67e1d38706a488b6002217e85d9ecddfbbd03"));
const getLatestRender = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("b61190700b9936ac80c0a33fc2caf1877a3767c0f60c663490b4cd40f82e221b"));
export {
  getLatestRender as a,
  getMyRenders as b,
  getCatalog as g
};
