/* load engine */
(function () {
  var s = document.createElement("script");
  s.src = "./js/app.js?v=5";
  s.onerror = function () {
    document.body.insertAdjacentHTML("beforeend", "<pre style=\"color:#ff0080\">engine missed</pre>");
  };
  document.body.appendChild(s);
})();
