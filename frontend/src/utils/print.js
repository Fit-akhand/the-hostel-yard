// Prints only the element with the class "print-area" (used for pop-ups such as the gate QR poster).
export function printArea() {
  document.body.classList.add('printing-area')
  const done = () => {
    document.body.classList.remove('printing-area')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
}
