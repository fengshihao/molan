/* 官网每天按 IP 计一次访问。只把路径发给 molan.guoyoutech.cn/m.gif，不存本机标识。 */
(function () {
  try {
    var path = location.pathname || "/";
    var img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = "https://molan.guoyoutech.cn/m.gif?p=" + encodeURIComponent(path);
  } catch (e) {}
})();
