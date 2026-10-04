# IATA Multilateral e-AWB Agreement — campos del Formstack

Form: https://iata.formstack.com/forms/multilateral_copy_2 (6 páginas, todos los inputs están en el DOM desde el inicio; el botón Next solo cambia de página).
Revisado el 2026-10-04 con datos de ejemplo, sin enviar. Al final hay una página "Review and Submit" y el envío real es el botón Submit.

| Pág. | Campo | ID | Req. | Notas |
| --- | --- | --- | --- | --- |
| 1 | Nombre del remitente | `field164242326` | sí | quien envía el formulario |
| 1 | Email del remitente | `field164242327` | sí | |
| 2 | Company Legal Name | `field164242330` | sí | MAYÚSCULAS |
| 2 | Address of Principal Office | `field164242331` | sí | |
| 2 | City | `field164242332` | sí | |
| 2 | Country | `field164242333` | sí | `<select>`, valor = nombre en inglés ("Chile") |
| 2 | IATA Cargo Agent Code | `field164242334` | sí | 7 dígitos o `N/A` |
| 2 | CASS/Branch code | `field164242335` | no | 4 dígitos |
| 3 | Designated Contact: nombre | `field164242337` | sí | MAYÚSCULAS |
| 3 | Job Title | `field164242338` | sí | en inglés |
| 3 | E-mail | `field164242339` | sí | |
| 3 | Telephone | `field164242340` | sí | `00` + país + área + número |
| 4 | 1er firmante: nombre | `field164242343` | sí | MAYÚSCULAS |
| 4 | E-mail | `field164242344` | sí | recibe el correo de firma |
| 4 | Job Title | `field164242345` | sí | con poder para obligar a la empresa |
| 4 | ¿2º firmante? | `field164242346_1` (Yes) / `_2` (No) | no | Yes muestra los 3 campos siguientes |
| 4 | 2º firmante: nombre | `field164242348` | si Yes | |
| 4 | Job Title | `field164242349` | si Yes | |
| 4 | Email | `field164242350` | si Yes | |
| — | IATA signatory e-mail | `field164242351` | no | oculto por lógica |
| 5 | 2º Designated Contact: nombre | `field164242353` | no | toda la página es opcional |
| 5 | Job Title | `field164242354` | no | |
| 5 | Company Name | `field164242355` | no | |
| 5 | Address | `field164242356` | no | |
| 5 | City | `field164242357` | no | |
| 5 | Country | `field164242358` | no | texto libre (no select) |
| 5 | ZIP/Postal | `field164242359` | no | |
| 5 | E-mail | `field164242360` | no | |
| 5 | Telephone | `field164242361` | no | |
| 5 | ¿2º Designated Contact? | `field164242362_1` (Yes) / `_2` (No) | no | |

Notas:
- El Review no mostró el código postal ni el CASS que ingresamos; la línea de dirección salió con un número extra ("23529136") aunque no ingresamos ZIP en la página 2. No es dato nuestro; se debe verificar al hacer un envío real.
- Prefill por URL **confirmado** (2026-10-04): `?field164242330=...` funciona para texto, select (nombre del país en inglés) y radio (`field164242346=Yes`). Lo usa `iataPrefillUrl()` en `src/lib/eawbAgreement.ts`.
