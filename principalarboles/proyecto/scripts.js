function actualizarBarraHuella() {
  const porcentaje = Math.max((huellaTotal / 150) * 100, 0);
  carbonBar.style.width = `${porcentaje}%`;
  carbonBar.textContent = `${huellaTotal.toFixed(2)} t`;

  // Eliminar colores anteriores
  carbonBar.classList.remove("progress-red", "progress-orange", "progress-yellow", "progress-green");

  // Asignar nuevo color según el porcentaje restante
  if (porcentaje > 75) {
    carbonBar.classList.add("progress-red");
  } else if (porcentaje > 50) {
    carbonBar.classList.add("progress-orange");
  } else if (porcentaje > 25) {
    carbonBar.classList.add("progress-yellow");
  } else {
    carbonBar.classList.add("progress-green");
  }
}
