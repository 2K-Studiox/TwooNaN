# Twoo Projects 🚀
### The Ultimate Management Workstation for Minecraft Event Developers

**Twoo Projects** es una infraestructura de gestión de operaciones de nivel empresarial, diseñada de manera exclusiva para empresas de desarrollo y equipos técnicos de alto rendimiento que operan en el nicho de eventos de Minecraft. Centraliza tareas, auditoría de personal, documentación y archivos críticos en una única plataforma colaborativa blindada.

---

## ⚠️ AVISO LEGAL Y RESTRICCIÓN ABSOLUTA DE USO (READ ONLY)

**ESTE PROYECTO ES DE PROPIEDAD EXCLUSIVA Y NO ES DE CÓDIGO ABIERTO (OPEN SOURCE).**

El código fuente presente en este repositorio es de **acceso público estrictamente con fines de auditoría de seguridad y transparencia**. Bajo ninguna circunstancia se concede permiso para el uso, modificación, compilación, distribución, copia o explotación comercial/personal del software contenido en este repositorio sin una autorización formal, expresa y firmada por **Twoo Studio Company**.

Al acceder a este repositorio, quedas sujeto a las siguientes cláusulas innegociables:

* **Tolerancia Cero al Uso Comercial o Privado:** Está terminantemente prohibido utilizar este software, su arquitectura o sus componentes de interfaz para gestionar proyectos, generar ingresos o integrarlo en cualquier infraestructura ajena a Twoo Studio.
* **Prohibición de Ingeniería Inversa:** Queda estrictamente prohibida la descompilación, ingeniería inversa, extracción de assets, o cualquier intento de desofuscación del binario compilado o del código fuente.
* **Alteración y Derivados:** No se permite la creación de trabajos derivados, "forks" públicos o privados, parches, o versiones modificadas ("cracks") orientadas a evadir el sistema de licencias.
* **Prohibición de Redistribución:** El alojamiento de este código en otros repositorios, foros, plataformas de distribución o servidores privados constituye una violación directa de los derechos de autor.
* **Protección de la API:** Cualquier intento de interactuar con nuestra API (`twoo-api.vercel.app`) mediante clientes de terceros, scripts automatizados o aplicaciones no autorizadas será considerado un ataque informático.

> **ADVERTENCIA LEGAL:** El incumplimiento de cualquiera de estos términos constituye una vulneración grave de la propiedad intelectual internacional y de la Ley de Delitos Informáticos. **Twoo Studio Company** cuenta con sistemas de trazabilidad y se reserva el derecho absoluto de emprender acciones legales inmediatas, demandas civiles por daños y perjuicios, y denuncias penales sin previo aviso ante cualquier uso fraudulento o no autorizado.

---

## 📩 Contacto Corporativo y Autorizaciones

La obtención de licencias (tipo `ADMINAPP`, `NEW_ORG_LICENSE` o `DEFAULT_LICENSE`) está estrictamente controlada. Si representas a una empresa de eventos, una comunidad o eres un desarrollador interesado en solicitar acceso a la red de **Twoo Projects**, debes establecer contacto oficial:

* **Organización:** Twoo Studio Company
* **Email Legal y de Soporte:** elfo2k@outlook.es
* **Discord Oficial:** @elfo2k_

Cualquier uso detectado fuera de los canales autorizados será bloqueado y reportado instantáneamente.

---

## ✨ Características de la Infraestructura

* **Workstation para Staff:** Editor de texto avanzado con modos de visualización específicos (Documentación y Código con resaltado de sintaxis inteligente `highlight.js`).
* **Gestión de Tareas (Kanban Dinámico):** Flujo de trabajo optimizado y sincronizado en tiempo real. Soporta asignación múltiple de usuarios, estados condicionales y muro de comentarios interactivo exclusivo para asignados.
* **Sincronización Cloud y Anti-Overwrite:** Acceso a la base de datos de archivos de la organización (`.txt`, `.twoo`, etc.) con un sistema de bloqueo de archivos (Lock/Unlock) que previene colisiones y sobreescrituras simultáneas por diferentes miembros del equipo.
* **Galería de Conceptos Privada y Encriptada:** Módulo de alta seguridad ("Conceptos") para la subida y resguardo de *concept arts*, bocetos y referencias visuales. Las imágenes son tratadas en formato Base64 directamente hacia el servidor, visualizables a través de un Lightbox interno seguro.
* **Control de Permisos Granular (RBAC):** Sistema de roles estricto (`ADMINAPP`, `ORG_ADMIN`, `USER`). El acceso a módulos sensibles como la galería de conceptos se controla individualmente por el administrador desde el panel de gestión en tiempo real.
* **Control Maestro Global (God Mode):** Panel de auditoría global exclusivo para administradores de sistema (`ADMINAPP`). Permite la inspección profunda de organizaciones, lectura de archivos remotos, gestión de licencias globales, reubicación de usuarios y envío de notificaciones Broadcast de emergencia.
* **Monitoreo en Tiempo Real (Heartbeat):** Sistema de telemetría constante (ping cada 30 segundos) que verifica el estado "Online/Offline" de los usuarios y sincroniza notificaciones push.

---

## 🛠️ Entorno de Desarrollo (Acceso Restringido)

Si eres parte del equipo de desarrollo y tu HWID ha sido previamente incluido en la lista blanca (Whitelist) de la base de datos maestra:

1. **Instalar dependencias estructurales:**
   `npm install`
2. **Iniciar aplicación en modo dev:**
   `npm start`
3. **Compilación de Binarios (Exclusivo para ADMINAPP):**
   `npm run dist`

> **Nota de Seguridad:** Iniciar el entorno de desarrollo desde un hardware no autorizado (HWID desconocido) alertará a los sistemas de seguridad y tu IP quedará registrada temporalmente en los registros de auditoría de Vercel/MongoDB.

---

## 🛡️ Seguridad, Integridad y Telemetría

**Twoo Projects** no es solo un gestor, es una fortaleza digital. El cliente de escritorio integra sistemas de validación intrusivos que aseguran la integridad del ecosistema:

1. **Vinculación Biométrica/Hardware (HWID):** La sesión del usuario está ligada criptográficamente a la placa base y componentes del dispositivo físico. Compartir licencias es tecnológicamente imposible.
2. **Trazabilidad Absoluta:** Cada acción crítica (subida de archivos, eliminación de tareas, intentos de inicio de sesión fallidos, cambios de permisos) es registrada con la marca de tiempo, usuario y hardware solicitante.
3. **Mecanismo de Autodefensa:** Cualquier intento de manipulación de la memoria del proceso, intercepción de red (Sniffing) hacia el endpoint de Vercel, o alteración del archivo `localStorage` resultará en la corrupción deliberada de la sesión local y el bloqueo permanente del HWID en la base de datos de MongoDB.

---
© 2026 **Twoo Studio Company**. Todos los derechos reservados y protegidos internacionalmente.
