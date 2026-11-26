# Ojo a Ojo — Dossier de revisión de literatura (verificada)

**Proyecto 3 · Computación Visual · UNAL Bogotá · 2026-2**  
**Profesor:** Jean Pierre Charalambos  
**Prototipo:** web app en Three.js con shaders GLSL explícitos, celular en Google Cardboard básico de cartón  
**Fecha de esta revisión:** 26 de noviembre de 2026 (America/Bogota, UTC−5)  
**Alcance del prototipo (obligatorio):** tamizaje visual / primer filtro. **No** es una herramienta de diagnóstico clínico ni un tratamiento.

---

## 0. Cómo leer este dossier

Este documento prioriza **ilusiones ópticas en 3D** (escenas y objetos espaciales, no cartillas planas 2D) como vehículo para evaluar, de forma exploratoria, indicios de **ambliopía (ojo vago)**: supresión interocular, dominancia binocular, fusión dicóptica en escenas 3D, rivalidad y percepción de profundidad/escala.

Todas las citas de este dossier fueron contrastadas contra al menos una fuente primaria o catálogo bibliográfico real (API Crossref, PubMed/eUtils, páginas del editor, PMC, documentación oficial de Google Cardboard, o el cuaderno `vcnotebook` vía el conector GitLab `get_pages_content`). **No se incluye ninguna referencia, DOI, métrica o parámetro que no haya podido verificarse.** Donde un paper “clásico” que se suele citar de memoria no apareció con esos autores/año (p. ej. un Li et al. 2010), se declara el vacío en la sección 8.

---

## 1. Marco del prototipo (condiciones que condicionan la literatura útil)

El visor de Camilo es un **Cardboard básico de cartón** con división fija entre los ojos, no un HMD comercial con IPD ajustable ni seguimiento posicional:

- La tapa cubre la cámara trasera → **sin AR / passthrough**.
- **Sin ajuste físico de IPD**; la separación de las cámaras virtuales y la alineación se resuelven en software, con calibración previa en pantalla normal (fuera del visor).
- **Sin botón físico garantizado** → la interacción dentro del visor es por **mirada fija / gaze dwell ≈ 1,5 s**, con puntero central y raycast.
- Seguimiento **3DoF por giroscopio** (orientación, no traslación). No hay paralaje de movimiento por tracking de posición.
- El entregable del curso exige **Three.js + shaders GLSL explícitos**, teoría primero, código + reporte y defensa oral (semanas 12–15).

Implicación de diseño: cada módulo debe ser una **ilusión o escena 3D** que cambie de manera interpretable cuando (a) hay fusión binocular / estereopsis, (b) un ojo suprime al otro, o (c) se reequilibra el contraste o el retraso interocular. Las cartillas dicópticas 2D (letras tipo Kwon/Birch, Worth 4-dot) se usan aquí solo como **fundamento psicofísico**, no como estímulos a clonar en pantalla plana.

---

## 2. Literatura científica verificada

### 2.1 Fundamento primario: ambliopía, supresión interocular y estímulos dicópticos

Estos trabajos no se implementan como cartillas 2D, pero sí aportan el modelo y los parámetros (punto de balance de contraste, relación con estereopsis, escaleras) que hay que trasladar a **objetos y escenas 3D**.

#### Combinación binocular y control de ganancia

- **Ding, J., & Sperling, G. (2006).** A gain-control theory of binocular combination. *Proceedings of the National Academy of Sciences, 103*(4), 1141–1146. https://doi.org/10.1073/pnas.0509629103  
  **Aporte:** modelo de control de ganancia: la contribución de cada ojo al percepto binocular no es una suma bruta de contrastes, sino una combinación ponderada. En Ojo a Ojo, el “punto de balance” de un objeto 3D dicóptico (cuánto contraste necesita el ojo no dominante para que el percepto deje de ser monocular) es la traducción operativa de esta idea.

- **Ding, J., Klein, S. A., & Levi, D. M. (2013).** Binocular combination in abnormal binocular vision. *Journal of Vision, 13*(2), 14. https://doi.org/10.1167/13.2.14  
  **Aporte:** extiende la combinación binocular a visión binocular anormal (ambliopía/estrabismo). Justifica medir un desequilibrio interocular cuantitativo, no solo “pasa/no pasa”.

- **Ding, J., & Levi, D. M. (2014).** Rebalancing binocular vision in amblyopia. *Ophthalmic and Physiological Optics, 34*(2), 199–213. https://doi.org/10.1111/opo.12115  
  **Aporte:** el rebalanceo de contraste entre ojos es una palanca para reducir supresión. En el prototipo, esa palanca se aplica a **material 3D** (partes o iluminancia de un objeto por ojo), no a un chart de letras.

#### Medición psicofísica de supresión y balance de contraste

- **Mansouri, B., Thompson, B., & Hess, R. F. (2008).** Measurement of suprathreshold binocular interactions in amblyopia. *Vision Research, 48*(28), 2775–2784. https://doi.org/10.1016/j.visres.2008.09.002 · PMID 18809424  
  **Aporte:** medición de interacciones binoculares supradesplazamiento (no solo umbral de agudeza). Base del enfoque de “antisupresión” del grupo de Hess.

- **Hess, R. F., Mansouri, B., & Thompson, B. (2010).** A binocular approach to treating amblyopia: Antisuppression therapy. *Optometry and Vision Science, 87*(9), 697–704. https://doi.org/10.1097/opx.0b013e3181ea18e9  
  **Aporte:** formaliza el enfoque binocular/antisupresión. **Nota de verificación:** no se encontró un artículo de Li et al. (2010) que coincida con la descripción habitual de “medición dicóptica de supresión”; el trabajo de 2010 en esta línea es este de Hess, Mansouri y Thompson. Los papers de Li en esta línea que sí se verificaron son 2011 y 2013 (abajo).

- **Li, J., Thompson, B., Lam, C. S. Y., Deng, D., Chan, L. Y. L., Maehara, G., Woo, G. C., Yu, M., & Hess, R. F. (2011).** The role of suppression in amblyopia. *Investigative Ophthalmology & Visual Science, 52*(7), 4169. https://doi.org/10.1167/iovs.11-7233  
  *(Crossref registra el primer nombre como Jingrong; es el mismo grupo / Jinrong Li.)*  
  **Aporte y parámetros:** en 43 pacientes (9–56 años) compararon Worth 4-dot y Bagolini + filtros de densidad neutra con un umbral dicóptico de movimiento (contraste interocular variable). El grado de supresión correlacionó con la diferencia de agudeza interocular y con peor estereoagudeza. El “balance point” es el contraste del ojo fijador al cual se supera la supresión y se combina la información de ambos ojos. **Para Ojo a Ojo:** ese balance point se puede buscar con un objeto 3D en movimiento o con partes complementarias por ojo, no con un optotipo plano.

- **Li, J., Hess, R. F., Chan, L. Y. L., Deng, D., Yang, X., Chen, X., Yu, M., & Thompson, B. (2013).** Quantitative measurement of interocular suppression in anisometropic amblyopia: A case-control study. *Ophthalmology, 120*(8), 1672–1680. https://doi.org/10.1016/j.ophtha.2013.01.048 · PMID 23622875  
  **Aporte y parámetros:** 45 casos de ambliopía anisometrópica y 45 controles (edad media 8,8 años). Usaron umbrales de coherencia de movimiento dicóptico, Bagolini + ND y Worth 4-dot; estereopsis con Randot preschool. La supresión fue más fuerte en pacientes y correlacionó con peor agudeza del ojo vago. En controles, una diferencia de **luminancia** (filtros ND) reprodujo niveles de supresión comparables a los de los pacientes; el **desenfoque** monocular no lo hizo igual. **Implicación 3D:** un módulo tipo Pulfrich (desequilibrio de luminancia) y un módulo de contraste dicóptico no son equivalentes a “simular” ambliopía solo con blur.

- **Narasimhan, S., Harrison, E. R., & Giaschi, D. E. (2012).** Quantitative measurement of interocular suppression in children with amblyopia. *Vision Research, 66*, 1–10. https://doi.org/10.1016/j.visres.2012.06.007 · PMID 22750021  
  **Aporte y parámetros:** niños de 5–16 años; gafas de realidad virtual; puntos de señal en alto contraste al ojo ambliope y ruido de bajo contraste al ojo compañero. Se sube el contraste del ruido hasta que la discriminación de dirección del movimiento global llega al azar. Los umbrales de interferencia de contraste fueron **más bajos (supresión más fuerte) en el grupo estrábico** que en anisometrópico y controles. **Para Cardboard:** es un antecedente directo de medir supresión con un HMD/visor, aunque el estímulo original es un campo de puntos 2D; en Ojo a Ojo esos puntos pueden ser un **enjambre 3D instanciado** (capítulo *Particles* del cuaderno).

- **Kwon, M., Wiecek, E., Dakin, S. C., & Bex, P. J. (2015).** Spatial-frequency dependent binocular imbalance in amblyopia. *Scientific Reports, 5*, 17181. https://doi.org/10.1038/srep17181 · PMID 26603125  
  **Aporte y parámetros:** chart dicóptico de letras Sloan filtradas pasa-banda (pico de 3 ciclos/letra), disposición tipo ETDRS, gafas de obturación. El **balance point** es la razón de contraste interocular (suma fija al 100 %) con la que el observador reporta la letra de cada ojo con igual probabilidad. En amblíopes el desequilibrio **aumentó en promedio 19 %** hacia las frecuencias espaciales altas (ejemplo reportado: BP de 0,63 a 0,5 c/deg hasta 0,90 a 5 c/deg). Incluyeron Worth 4-dot como criterio de supresión. Hubo un resumen de congreso en 2014 (VSS / *Journal of Vision*); el artículo completo verificable es este de 2015. **Para Ojo a Ojo:** no se copia el chart; sí se puede variar la frecuencia espacial / el tamaño aparente de **detalle en un objeto 3D** al medir el mismo punto de balance.

- **Birch, E. E., Morale, S. E., Jost, R. M., De La Cruz, A., Kelly, K. R., Wang, Y.-Z., & Bex, P. J. (2016).** Assessing suppression in amblyopic children with a dichoptic eye chart. *Investigative Ophthalmology & Visual Science, 57*(13), 5649. https://doi.org/10.1167/iovs.16-19986  
  **Aporte y parámetros:** 100 niños de 7–12 años (63 amblíopes) y una cohorte secundaria de 22 niños de 3–6 años. Cinco letras por línea, ocho líneas, tres tamaños; **contrast balance ratio** = razón en la que se reporta el 50 % de las letras del ojo ambliope. Los niños amblíopes requirieron **4,6 a 5,6 veces más contraste** en el ojo ambliope que en el compañero. La razón correlacionó con la agudeza del ojo vago (r ≈ 0,49–0,57) y el cambio con el tratamiento (r ≈ 0,43–0,62). **Uso en el prototipo:** rango de contraste a explorar en objetos 3D (varios factores, no un “on/off”), y advertencia de que un chart 2D no es el estímulo del proyecto.

- **Webber, A. L., Schmid, K. L., Baldwin, A. S., & Hess, R. F. (2020).** Suppression rather than visual acuity loss limits stereoacuity in amblyopia. *Investigative Ophthalmology & Visual Science, 61*(6), 50. https://doi.org/10.1167/iovs.61.6.50 · PMID 32579677  
  **Aporte:** en observadores amblíopes la estereoagudeza correlacionó con la profundidad de supresión (contrast ratio), **no** con la diferencia de agudeza interocular. Al atenuar el contraste del estímulo del ojo dominante para neutralizar la supresión, la estereoagudeza mejoró en una submuestra. Usaron estereopsis digital de puntos aleatorios. **Diseño 3D:** un módulo de RDS / superficie volumen y un módulo de balance de contraste deben leerse juntos: si al rebalancear aparece profundidad ciclópea, eso es un indicio de que la limitación era supresión y no (solo) agudeza.

#### Rivalidad binocular (Levelt)

- **Levelt, W. J. M. (1965).** Binocular brightness averaging and contour information. *British Journal of Psychology, 56*, 1–13. https://doi.org/10.1111/j.2044-8295.1965.tb00939.x  
- **Levelt, W. J. M. (1966).** The alternation process in binocular rivalry. *British Journal of Psychology, 57*, 225–238. https://doi.org/10.1111/j.2044-8295.1966.tb01023.x  
- **Brascamp, J. W., Klink, P. C., & Levelt, W. J. M. (2015).** The ‘laws’ of binocular rivalry: 50 years of Levelt’s propositions. *Vision Research, 109*, 20–37. https://doi.org/10.1016/j.visres.2015.02.019  

  **Aporte:** las “leyes” de Levelt relacionan el contraste (o fuerza del estímulo) de cada ojo con la predominancia perceptual y la dinámica de alternancia. En una escena 3D, si cada ojo recibe un atributo incompatible (textura, color o movimiento de un mismo objeto), la predominancia o la ausencia total de un ojo es un signo de dominancia/supresión. No se usa como diagnóstico; sí como módulo cualitativo de rivalidad en profundidad.

#### Worth 4-dot (referencia clínica, no módulo 3D)

- **Roper-Hall, G. (2004).** The “Worth” of the Worth Four Dot Test. *American Orthoptic Journal, 54*, 112–119. https://doi.org/10.3368/aoj.54.1.112  
  **Aporte:** revisión del test clásico de fusión/supresión/diplopía. Li et al. (2011, 2013), Kwon et al. (2015) y Martín et al. (2020) lo usan como ancla clínica. **Ojo a Ojo no debe implementar un Worth 4-dot plano como prueba principal**; puede mencionarse en el informe como referente, y, si se desea, evocar su lógica (puntos de distinto color/ojo) en un **objeto 3D** con partes exclusivas por ojo.

#### Tratamiento dicóptico (contexto, no objetivo del prototipo)

Estos papers son de **terapia**, no de tamizaje. Se citan solo para no confundir alcance y para documentar que el rebalanceo de contraste aparece también en ensayos clínicos, con resultados mixtos.

- **Birch, E. E., Li, S. L., Jost, R. M., Morale, S. E., De La Cruz, A., Stager, D., Dao, L., & Stager, D. R. (2015).** Binocular iPad treatment for amblyopia in preschool children. *Journal of AAPOS, 19*(1), 6–11. https://doi.org/10.1016/j.jaapos.2014.09.009 · PMID 25727578  
- **Holmes, J. M., Manh, V. M., Lazar, E. L., Beck, R. W., Birch, E. E., Kraker, R. T., … Wallace, D. K. (2016).** Effect of a binocular iPad game vs part-time patching in children aged 5 to 12 years with amblyopia. *JAMA Ophthalmology, 134*(12), 1391. https://doi.org/10.1001/jamaophthalmol.2016.4262  
  Ensayo multicéntrico de no inferioridad (n = 385): la mejora de agudeza a 16 semanas fue de 1,05 líneas (juego binocular) vs 1,35 (parche 2 h/día); no se pudo establecer no inferioridad. La adherencia al juego fue baja (solo 22,2 % hizo más del 75 % de lo prescrito). **Lección para el informe:** incluso como terapia, el dicóptico digital no sustituye un examen clínico; menos aún un prototipo de aula.

- **Hess, R. F., & Thompson, B. (2015).** Amblyopia and the binocular approach to its therapy. *Vision Research, 114*, 4–16. https://doi.org/10.1016/j.visres.2015.02.009  
- **Levi, D. M., Knill, D. C., & Bavelier, D. (2015).** Stereopsis and amblyopia: A mini-review. *Vision Research, 114*, 17–30. https://doi.org/10.1016/j.visres.2015.01.002  
  La deficiencia de estereopsis es el déficit más común de la ambliopía en visión binocular cotidiana. La estereopsis se degrada más con blur/contraste **monocular** que con blur en ambos ojos. El entrenamiento dicóptico y el entrenamiento directo de estereo son más prometedores en ambliopía estrábica que el entrenamiento solo monocular.

---

### 2.2 Enfoque prioritario: ilusiones ópticas 3D, estereopsis y escala

#### Estereogramas de puntos aleatorios (RDS) y profundidad ciclópea

- **Julesz, B. (1960).** Binocular depth perception of computer-generated patterns. *Bell System Technical Journal, 39*(5), 1125–1162. https://doi.org/10.1002/j.1538-7305.1960.tb03954.x  
  **Aporte y parámetros verificados en el artículo:** pares estéreo generados por computador (IBM 704); 10 000 puntos con hasta 16 niveles de brillo; un ejemplo de 99 × 105 elementos con un cuadrado central de 40 × 40 y un corrimiento (disparidad) de **4 elementos**. Vistos monocularmente son ruido; en fusión, el cuadrado aparece delante o detrás. Eso demuestra profundidad **sin pistas monoculares de forma**. El efecto tarda más en aparecer que en un estéreo “familiar”, pero luego es estable. También muestra que la cuantización a dos niveles (blanco/negro) sigue permitiendo el efecto.  
  **Para Ojo a Ojo:** un módulo 3D de superficie/volumen RDS (no una lámina impresa) es el test de estereopsis “ciclopea” más limpio: si la forma solo existe en la fusión, no se puede adivinar con un ojo. En tamizaje hay que pedir también el **signo** de la profundidad (delante/detrás), no solo “vi algo”.

- **Julesz, B. (1971).** *Foundations of Cyclopean Perception.* University of Chicago Press.  
  Monografía clásica, verificada por citas consistentes en fuentes primarias posteriores (p. ej. Patterson y Fox, 1983; Lappin, 2014, *Frontiers in Psychology*, https://doi.org/10.3389/fpsyg.2014.00870). Introduce de forma sistemática la percepción ciclópea y muestra que varias ilusiones de tamaño (incluidas configuraciones tipo Ponzo/corredor) pueden presentarse en el nivel ciclópeo.

**Límite crítico en Cardboard (no es un dato clínico fino):** ver Bonfanti et al. (2015) en §2.4. En un celular típico la disparidad mínima de **1 píxel** queda en el orden de **≈ 120–160 arcsec**, por encima de una estereoagudeza “excelente” clásica (~60 arcsec en el mismo paper). El módulo RDS en Cardboard es un **filtro grueso** (¿hay estereopsis de disparidades grandes?), no un medidor clínico de 20–40 arcsec.

#### Máscara hueca (Hollow-Mask / hollow-face)

- **Gregory, R. L. (1970).** *The Intelligent Eye.* Londres: Weidenfeld & Nicolson (ISBN 0-297-00021-7; 191 p.; Open British National Bibliography). También hay edición McGraw-Hill, 1970 (ISBN 0-07-024664-5).  
  Monografía clásica sobre percepción como hipótesis y sobre ilusiones de inversión de profundidad (máscara/rostro hueco). **No se citan aquí resultados numéricos del libro** (no se paginó el ejemplar). Los datos cuantitativos binocular vs monocular se toman de los artículos siguientes.

- **Hill, H., & Bruce, V. (1993).** Independent effects of lighting, orientation, and stereopsis on the hollow-face illusion. *Perception, 22*(8), 887–897. https://doi.org/10.1068/p220887 · PMID 8190593  
  **Aporte y parámetros:** midieron la distancia a la que la ilusión aparece o desaparece al acercarse/alejarse. Hubo efectos independientes de orientación (preferencia por rostros upright) e iluminación (preferencia por luz desde arriba); las caras invertidas también producían algo de ilusión (preferencia general por convexidad). La comparación monocular vs binocular: **la visión monocular produjo distancias más cortas**, lo que indica que las **disparidades retinianas ayudan a desambiguar la ilusión a distancias pequeñas**.  
  **Para Cardboard 3DoF:** es una de las ilusiones que mejor encajan. Se modela una máscara cóncava 3D, con luz desde arriba, y se compara: (1) modo dicóptico con disparidad correcta, (2) modo “monocular” (misma imagen a ambos ojos, o un ojo en negro). Si con estereopsis la concavidad se percibe (o la ilusión se rompe más cerca) y sin ella el rostro “salta” a convexo, hay un contraste binocular vs monocular interpretable. El giroscopio permite orbitar un poco el objeto; no hay tracking de traslación.

- **Matthews, H., Hill, H., & Palmisano, S. (2011).** Binocular disparity magnitude affects perceived depth magnitude despite inversion of depth order. *Perception, 40*(8), 975–988. https://doi.org/10.1068/p6915 · PMID 22132512  
  **Aporte:** usaron imágenes estéreo generadas por computador. Aunque la máscara hueca se siga viendo convexa (el orden de profundidad se invierte respecto a la disparidad), **la magnitud de la disparidad sigue influyendo en la profundidad aparente**; las caras cóncavas se percibían más “planas” que las convexas. **Diseño:** no basta un sí/no de “se rompió la ilusión”; se puede pedir una igualación o un juicio de “¿cuál se ve más profunda?” entre dos rostros 3D con distinta disparidad.

#### Cuarto de Ames (profundidad, escala y perspectiva)

- **Ittelson, W. H. (1952).** *The Ames demonstrations in perception: A guide to their construction and use.* Princeton University Press.  
  Guía clásica de construcción de las demostraciones de Ames (cuarto trapezoidal que, desde un punto de vista fijo, proyecta como una habitación rectangular). Verificada por citación académica consistente (p. ej. en discusiones posteriores de la ilusión de tamaño-distancia). No tiene DOI de artículo.

- **Sawada, T. (2024).** Projective collineation formulation of the Ames room (preprint). OSF. https://doi.org/10.31234/osf.io/y9bvs  
  **Aporte para Ojo a Ojo:** formalización con transformación $X' = E + (X-E)/(1 + w\cdot(X-E))$ que preserva alineación de líneas y planos; el módulo 3D aplica esa colineación a una habitación rectangular canónica y texturas procedimentales en coordenadas arquitectónicas ($aArch$).

- **Gehringer, W. L., & Engel, E. (1986).** Effect of ecological viewing conditions on the Ames' distorted room illusion. *Journal of Experimental Psychology: Human Perception and Performance, 12*(2), 181–185. https://doi.org/10.1037/0096-1523.12.2.181 · PMID 2940322  
  **Aporte:** Gibson había afirmado que la ilusión se elimina con visión binocular y/o movimiento de cabeza. Con 144 observadores, visión mono/binocular y cabeza fija/libre, **la ilusión disminuyó al aumentar el acceso visual, pero persistió en todas las condiciones**.  
  **Para Cardboard 3DoF:** el visor aporta disparidad binocular, pero **no** tracking de traslación (el paralaje de movimiento de Gehringer queda fuera). Es un test razonablemente limpio de “¿basta la estereopsis para romper o atenuar la ilusión de escala del cuarto?”, sin la confusión del 6DoF.

- **Dorward, F. M. C., & Day, R. H. (1997).** Loss of 3-D shape constancy in interior spaces: The basis of the Ames-room illusion. *Perception, 26*(6), 707–718. https://doi.org/10.1068/p260707  
  **Aporte:** en una versión a escala 1/10, la constancia interior se **restableció casi por completo con visión binocular** (experimento 1). Hay una tensión empírica útil para el informe: Gehringer y Engel (1986) ven persistencia; Dorward y Day (1997), en un cuarto miniatura, ven una restauración casi completa. Ojo a Ojo, como prototipo de aula, puede **documentar el sentido del cambio** (ilusión más fuerte en monocular que en estéreo) sin pretender resolver ese debate.

- **Rogers, B. (2022).** When is an illusion not an illusion? An alternative view of the illusion concept. *Frontiers in Human Neuroscience, 16*, 957740. https://doi.org/10.3389/fnhum.2022.957740 · PMID 36118968  
  **Aporte:** el cuarto de Ames se diseña para que, desde el *peephole*, el patrón de luz coincida con el de una habitación rectangular (conexión directa con el capítulo *Projection* del cuaderno: la perspectiva lineal es exacta **solo desde su centro**). Rogers reporta que, en sus experimentos recientes, **las disparidades binoculares no bastaron para anular la información de perspectiva** que especifica una habitación rectangular. Eso refuerza usar Ames en Cardboard como ilusión robusta a la estereopsis, complementaria a la máscara hueca (donde Hill y Bruce sí vieron un papel desambiguador de la disparidad a corta distancia).

#### Ponzo / corredor 3D (tamaño-distancia en escena)

- **Patterson, R., & Fox, R. (1983).** Depth separation and the Ponzo illusion. *Perception & Psychophysics, 34*(1), 25–28. https://doi.org/10.3758/BF03205892  
  **Aporte:** llevaron la configuración Ponzo a **contornos estereoscópicos de estereogramas dinámicos de elementos aleatorios** (profundidad ciclópea). La separación en profundidad modularon la magnitud: la ilusión **disminuyó** cuando el ángulo inductor aparecía *detrás* de las líneas y **aumentó** cuando aparecía *delante*. La ilusión no desaparece solo por tener disparidad; su tamaño depende de la geometría 3D relativa.  
  **Para Ojo a Ojo:** un corredor 3D (paredes convergentes + dos objetos de igual tamaño en distinto “andar”) permite comparar monocular vs binocular y, además, manipular la disparidad del contexto vs la de los objetos. Encaja en 3DoF (un corredor visto desde un punto, con giro de cabeza).

#### Efecto Pulfrich (movimiento + retraso o luminancia interocular → profundidad)

- **Pulfrich, C. (1922).** Die Stereoskopie im Dienste der isochromen und heterochromen Photometrie. *Naturwissenschaften, 10*(25), 553–564. https://doi.org/10.1007/BF01571319  
  Descripción original: un objeto en movimiento lateral, visto con un filtro de densidad neutra ante un ojo, parece desplazarse en profundidad (elipse). La explicación clásica de “línea de retraso” (el ojo oscurecido tarda más) aparece retomada en literatura posterior verificada (p. ej. discusión en Spang y Morgan, 2008, *Journal of Vision*; se cita aquí solo como contexto del mecanismo, no como módulo obligatorio).

- **Tredici, T. D., & von Noorden, G. K. (1984).** The Pulfrich effect in anisometropic amblyopia and strabismus. *American Journal of Ophthalmology, 98*(4), 499–503. https://doi.org/10.1016/0002-9394(84)90139-9  
  **Aporte:** el efecto se ha medido en ambliopía anisometrópica y estrabismo. Es un antecedente clínico directo de usar Pulfrich en esta población (como fenómeno, no como diagnóstico único).

- **Thompson, P., & Wood, V. (1993).** The Pulfrich pendulum phenomenon in stereoblind subjects. *Perception, 22*(1), 7–14. https://doi.org/10.1068/p220007  
  **Aporte:** sujetos descritos como estereociegos **pueden reportar el efecto Pulfrich** aunque fallen en fusionar RDS y no muestren transferencia interocular del aftereffect de movimiento. **Precaución de diseño:** un Pulfrich positivo no demuestra estereopsis clásica por disparidad espacial (puede haber un mecanismo residual o una disparidad temporal). Por eso el prototipo debe **combinar** Pulfrich con un módulo RDS: son pruebas distintas.

**Encaje en Cardboard 3DoF:** excelente. Un péndulo o un objeto que cruza el frente, con un shader que baja la luminancia (o introduce un retraso de fotogramas) en un ojo, no requiere tracking de posición. La tarea es reportar el sentido de la elipse (horario / antihorario) o si el movimiento se percibe plano.

---

### 2.3 Métodos psicofísicos adaptativos (pocos ensayos, gaze dwell)

Con dwell de ≈ 1,5 s, 15–30 ensayos duran varios minutos por prueba; hay que elegir un método que estime un umbral (o un balance point) con esa economía, no una función psicométrica completa.

- **Levitt, H. (1971).** Transformed up-down methods in psychoacoustics. *The Journal of the Acoustical Society of America, 49*(2B), 467–477. https://doi.org/10.1121/1.1912375  
  **Aporte:** formaliza las escaleras transformadas. Las reglas clásicas apuntan a puntos distintos de la función psicométrica: **1-arriba / 2-abajo → 70,7 %**; **1-arriba / 3-abajo → 79,4 %**. Una escalera 1-arriba / 1-abajo (usada en Martín et al., 2020; ver abajo) apunta al 50 %, que es exactamente la definición del balance point dicóptico (igual probabilidad de reportar cada ojo).  
  **En Cardboard:** es la opción más simple de implementar y de explicar en el reporte. Converge con relativamente pocos ensayos si el paso no es minúsculo.

- **Watson, A. B., & Pelli, D. G. (1983).** QUEST: A Bayesian adaptive psychometric method. *Perception & Psychophysics, 33*(2), 113–120. https://doi.org/10.3758/BF03202828 · PMID 6844102  
  **Aporte:** método bayesiano adaptativo para estimar el umbral, más eficiente que una escalera ingenua si el prior es razonable. Es una buena segunda opción si se implementa con cuidado (librería o implementación propia bien tesada). **No se atribuyen aquí conteos de ensayos que el artículo no se verificó línea por línea.**

- **Kontsevich, L. L., & Tyler, C. W. (1999).** Bayesian adaptive estimation of psychometric slope and threshold. *Vision Research, 39*(16), 2729–2737. https://doi.org/10.1016/S0042-6989(98)00285-5  
  **Aporte:** el método Psi estima **umbral y pendiente** a la vez. Eso exige más información que estimar solo el umbral. **Para un tamizaje de 15–30 ensayos con gaze dwell, Psi no es la primera elección**; conviene reservarlo, si acaso, a una sesión larga de laboratorio, no al visor.

- **Martín, S., Portela, J. A., Ding, J., Ibarrondo, O., & Levi, D. M. (2020).** Evaluation of a virtual reality implementation of a binocular imbalance test. *PLOS ONE, 15*(8), e0238047. https://doi.org/10.1371/journal.pone.0238047  
  **Parámetros de procedimiento (los más accionables para Ojo a Ojo):** escalera **1-arriba / 1-abajo**; máximo **16 reversiones o 40 ensayos** (≈ 2 min en su setup); se considera válida si hay **más de 9 reversiones**; el Imbalance Ratio es la **media de las últimas 4 reversiones** (contraste del ojo débil / contraste del dominante para igual probabilidad). IR = 1,0 es equilibrio; IR = 3,0 significa que el ojo ambliope necesita tres veces más contraste. Test-retest en n = 20 sin diferencia significativa (p = 0,831). Correlación con Worth 4-dot (r = 0,538) y con estereoagudeza (r = 0,675). **Límites del HMD que ellos mismos reportan:** rango de IPD del casco ≈ 61–73 mm; por resolución, solo pudieron probar **0,68 cpd** (el desequilibrio ambliope es más evidente en frecuencias altas).  
  **Traducción al Cardboard:** usar la misma lógica de escalera y de IR sobre un **objeto 3D**, no letras a 0,68 cpd si la resolución no da; y declarar el IPD virtual y la frecuencia espacial efectiva del estímulo.

**Recomendación fundamentada (no es un dogma clínico):** para 15–30 ensayos con dwell, una **escalera 1-up / 1-down** al estilo Martín et al. (2020) es la opción más alineada con un punto de balance al 50 % y con la literacidad del curso. QUEST es razonable si se quiere más eficiencia. Psi se deja fuera del visor.

---

### 2.4 Tamizaje o medición en VR, HMD, Cardboard o móvil

- **Bonfanti, S., Gargantini, A., & Vitali, A. (2015).** A mobile application for the stereoacuity test. En V. G. Duffy (Ed.), *Digital Human Modeling… DHM 2015* (LNCS 9185, pp. 315–326). Springer. https://doi.org/10.1007/978-3-319-21070-4_32  
  **Aporte y parámetros (Cardboard + RDS):** app Android tipo Randot; la forma está oculta en puntos aleatorios y se desplaza horizontalmente N píxeles. Tabla verificada de disparidad de 1 píxel (bajo sus supuestos ópticos de lente/magnificador): Galaxy S5 (431,9 ppi) **156,5 arcsec**; LG G3 (534 ppi) **126,6 arcsec**; Meizu MX4 Pro (542,8 ppi) **124,5 arcsec**. El paper toma ≈ 60 arcsec como estereoagudeza “excelente” y concluye que, con pantallas de entonces, el mínimo medible queda **por encima** de ese valor. Los ensayos preliminares fueron solo en **cinco usuarios sin enfermedad visual**.  
  **Lección:** Ojo a Ojo puede hacer RDS en Cardboard como **filtro de estereopsis gruesa**, y debe reportar la disparidad en arcsec **calculada para el teléfono del usuario**, no como si midiera 20 arcsec.

- **Martín et al. (2020)** — ya citado: implementación VR (HTC Vive) de un test de imbalance (adaptación del chart de Kwon et al.), con alineación dicóptica de noius previa. Es el antecedente más sólido de un test de desequilibrio binocular en un HMD. Su resolución y su IPD fijo son advertencias que en Cardboard se agravan.

- **Žiak, P., Holm, A., Halička, J., Mojžiš, P., & Piñero, D. P. (2017).** Amblyopia treatment of adults with dichoptic training using the virtual reality oculus rift head mounted display: Preliminary results. *BMC Ophthalmology, 17*, 105. https://doi.org/10.1186/s12886-017-0501-8  
  **Aporte:** 17 adultos con ambliopía anisometrópica; 8 sesiones de 40 min en Oculus Rift DK2 (juego dicóptico). Mejoraron agudeza y estereopsis en el grupo; es **terapia preliminar**, no tamizaje, y no es Cardboard. Sirve como evidencia de que un HMD puede entregar estímulo dicóptico 3D, no como validación clínica de Ojo a Ojo.

- **Yang, Y., & Wu, H. (2019).** Screening for stereopsis of children using an autostereoscopic smartphone. *Journal of Ophthalmology, 2019*, 1570309. https://doi.org/10.1155/2019/1570309 · PMID 31781370  
  **Aporte:** 51 niños de 3–6 años; teléfono autostereoscópico (1920 × 1080, 401 ppi) que imita Lang I/II y otros tests. Alta concordancia con los tests de cartón (kappa ponderado > 0,84). El propio artículo menciona el trabajo de Bonfanti con Cardboard como antecedente con instrumento adicional. **No es Cardboard**, pero sí un precedente de **tamizaje de estereopsis en smartphone**.

- **Chan, H. S., Tang, Y. M., Do, C. W., Wong, H. H. Y., Chan, L. Y. L., & To, S. (2023).** Design and assessment of amblyopia, strabismus, and myopia treatment and vision training using virtual reality. *Digital Health, 9*. https://doi.org/10.1177/20552076231176638  
  Revisión de 48 trabajos (2000–2023): 31 de ambliopía. Documenta el uso de visores tipo smartphone / Google Cardboard en investigación de ambliopía (cita, entre otros, a Vichitvejpaisal y Chotine, 2017, y a Saraiva et al., 2018). Útil como mapa del campo; **no sustituye** un paper de validación clínica del prototipo.

- **Levi, D. M. (2023).** Applications and implications for extended reality to improve binocular vision and stereopsis. *Journal of Vision, 23*(1), 14. https://doi.org/10.1167/jov.23.1.14  
  Revisión de medición y terapia de anomalías binoculares en XR. Advierte que varios tests en HMD comerciales no alcanzan umbrales finos de estereoagudeza y pueden correlacionar solo débilmente con un Randot “gold standard”. Encaja con la tesis de este dossier: **prototipo de primer filtro, no diagnóstico**.

---

### 2.5 Óptica de Cardboard, calibración en el navegador y límites de pantallas de consumo

#### Distorsión de las lentes (modelo de Brown y coeficientes oficiales)

Documentación oficial de Google, no un paper:

- Google Cardboard Manufacturer Help, *Overview of generating a QR viewer profile*: https://support.google.com/cardboard/manufacturers/answer/6321873?hl=en  
  Parámetros del visor **oficial** Google Cardboard (inspirado):

  | Parámetro | Valor verificado |
  |---|---|
  | Distancia pantalla–lente | 39,3 mm |
  | Distancia inter-lentes | 63,9 mm |
  | Alineación vertical de pantalla | Bottom |
  | Bandeja a centro de lente | 35 mm |
  | Coeficiente k1 | **0,33582564** |
  | Coeficiente k2 | **0,55348791** |
  | Tipo de botón (oficial) | Indirect touch |

  La misma página advierte que esos valores **valen para visores oficiales / inspirados en Cardboard**. Si las lentes o la caja son distintas (el caso de Camilo: caja de cartón genérica, IPD físico fijo), hay que generar un perfil propio o, en el prototipo, **dejar k1/k2 y la separación virtual como parámetros calibrables**.

- Google Cardboard Manufacturer Help, *Enter physical viewer parameters*: https://support.google.com/cardboard/manufacturers/answer/6324808?hl=en  
  Las lentes típicas de VR móvil producen **distorsión de almohadilla (pincushion)** en la imagen vista; se corrige con el **modelo de Brown**, exponiendo k1 y k2. El criterio de calibración es que las líneas rectas y los ángulos de 90° sigan viéndose rectos en el centro y en la periferia. En parámetros avanzados, los ángulos de FOV del ojo izquierdo “para la mayoría de visores deben fijarse en **50° o más**” (son semiángulos de recorte de render, no necesariamente el FOV óptico medido).

- Google VR SDK (archivo), clase `Distortion`: https://developers.google.com/vr/reference/android/com/google/vr/sdk/base/Distortion  
  Ecuación documentada (la que debe ir al shader de pre-distorsión, en sentido inverso al de la lente):

  `p' = p (1 + K1 r² + K2 r⁴ + … + Kn r^(2n))`

  donde r es la distancia al centro óptico **en unidades de tan-ángulo** (distancia en pantalla / distancia ojo virtual–pantalla). El SDK habla de “barrel distortion coefficients” para la corrección que cancela el pincushion de la lente. La implementación en GLSL es un **render-to-texture por ojo + pasada de warp** (capítulo *Render to texture* del cuaderno). El SDK también documenta un FOV por defecto de **45° de semiángulo** (90° totales) cuando no hay parámetros.

**Advertencia:** estos k1/k2 **no** deben presentarse como los de la caja de Camilo hasta no calibrarlos. Son el default documentado de partida.

#### Calibración de tamaño físico en el navegador (Virtual Chinrest / tarjeta)

- **Li, Q., Joo, S. J., Yeatman, J. D., & Reinecke, K. (2020).** Controlling for participants’ viewing distance in large-scale, psychophysical online experiments using a Virtual Chinrest. *Scientific Reports, 10*, 904. https://doi.org/10.1038/s41598-019-57204-1 · PMID 31969579  
  **Aporte y parámetros:** método web en dos partes: (1) una **tarea de tarjeta** para obtener el tamaño físico del píxel (LPD); (2) una tarea de **punto ciego** para estimar la distancia de observación, usando un ángulo de entrada del punto ciego de **13,5°** (calibrado por los autores; la literatura del centro del punto ciego que ellos citan ronda ~15°). Error absoluto medio de distancia en laboratorio: **3,25 cm** (DE 2,40 cm) al variar tamaño de pantalla y distancia; en una validación con mentonera física a 53,0 cm, el error medio fue 2,36 cm.  
  **Para Ojo a Ojo:** la calibración **antes de meter el celular al visor** puede usar la tarea de tarjeta para PPI real (necesario para convertir píxeles de disparidad en arcsec y para fijar tamaños angulares). La tarea de punto ciego mide distancia de observación en pantalla libre; **dentro del Cardboard esa distancia queda fijada por la caja** (en el visor oficial, 39,3 mm pantalla–lente, más la óptica). No hay que aplicar el punto ciego *dentro* del visor como si la distancia fuera desconocida; sí hay que usar el PPI calibrado y la geometría del visor para el cálculo angular.

  El tamaño de una tarjeta ID-1 está normalizado en **ISO/IEC 7810** (85,60 × 53,98 mm). Es el objeto habitual de la “credit-card task”; el paper habla de “card task” sin que este dossier atribuya al paper un milimetraje que no se transcribió línea por línea.

#### Resolución angular realista en celular + Cardboard

Dos cifras de naturaleza distinta, ambas declaradas:

1. **Empírica / óptica del paper de Bonfanti et al. (2015):** 1 píxel de disparidad ≈ **124–157 arcsec** en flagships de ~430–540 ppi (tabla del artículo, con su modelo de lente de aumento). Esa es la resolución de disparidad que un test RDS en Cardboard puede *ofrecer* en esos equipos.
2. **Estimación geométrica grosera (no es un dato experimental):** si se asume un FOV horizontal por ojo del orden de 90° (semiángulos por defecto de 45° en el SDK) y ~1000–1300 px por ojo en un teléfono 1080p–1440p en apaisado, se obtiene un orden de magnitud de **centenares de arcsec por píxel**. La diferencia con Bonfanti viene del modelo de la lupa (el celular no se ve a 39 mm “en aire”, sino a través de una lente positiva).  

**Conclusión de diseño, sin inflar precisión:** el prototipo debe (a) calcular arcsec a partir de PPI calibrado + geometría declarada del visor, (b) usar disparidades **de varios píxeles** para el tamizaje, y (c) **no afirmar** que mide estereoagudeza clínica de 20–60 arcsec.

#### Límites de pantallas de consumo (lo que sí está respaldado)

No se inventa un paper genérico de “gamma no calibrada”. Los límites se apoyan en fuentes ya verificadas y en el cuaderno:

- **Gamma / luminancia no calibrada:** el capítulo *Color Ops* del cuaderno enseña que un producto de contraste en bytes sRGB **no** es un producto en luz. Un balance dicóptico debe calcularse en espacio lineal (transfer sRGB a trozos, no el atajo de γ = 2,2) y aun así la luminancia absoluta del celular no está calibrada: el IR es **relativo al dispositivo**.
- **Resolución y frecuencia espacial:** Martín et al. (2020) no pudieron subir de 0,68 cpd en un Vive; Kwon et al. (2015) muestran más desequilibrio a 5 c/deg que a 0,5. En Cardboard, el desequilibrio medido en detalle fino estará limitado por píxeles y por blur de la lente.
- **Crosstalk óptico:** la división de cartón no es un separador óptico perfecto; luz de un hemicampo puede filtrarse al otro ojo y reducir el contraste dicóptico efectivo. No se encontró (en esta pasada) un paper que cuantifique el crosstalk de *esta* caja; hay que declararlo como limitación de ingeniería y, si se puede, mitigarlo con un tabique opaco y con no poner estímulos críticos en el borde central.
- **IPD no ajustable y error de alineación:** Martín et al. (2020) ya señalan el IPD del casco como limitación importante. En una caja fija, un IPD virtual mal elegido produce diplopía o molestia, no un “diagnóstico”. La calibración en pantalla (nonius dicóptico, como en Martín et al.) es previa y obligatoria.
- **Errores refractivos no corregidos:** un usuario sin su corrección puede fallar un RDS o un detalle de alta frecuencia por desenfoque, no por supresión (Li et al., 2013, ya distinguen blur vs diferencia de luminancia). El prototipo debe pedir que se use la corrección habitual y no interpretar un fallo como ambliopía.
- **3DoF sin paralaje de traslación:** Gehringer y Engel (1986) muestran que el movimiento de cabeza también atenúa el Ames. Ojo a Ojo no puede invocar ese cue.

---

## 3. Tabla de parámetros psicofísicos y ópticos (solo valores verificados o cálculos declarados)

| Parámetro | Valor / regla | Fuente verificada | Uso en Ojo a Ojo |
|---|---|---|---|
| Punto de balance dicóptico | Razón de contraste interocular con P = 50 % de reportar cada ojo | Kwon et al., 2015; Birch et al., 2016; Martín et al., 2020 | Buscarlo en un **objeto 3D**, no en un chart |
| Rango ilustrativo de razón de contraste en niños amblíopes (chart 2D) | 4,6–5,6 × más contraste en el ojo ambliope | Birch et al., 2016 | Explorar varios factores de contraste; no usar esos números como umbral diagnóstico |
| Desequilibrio según frecuencia espacial | Mayor en SF altas (aumento medio del 19 % en su muestra) | Kwon et al., 2015 | Preferir detalle medio-alto, dentro de lo que el celular permita |
| Escalera de imbalance en VR | 1-up/1-down; máx. 16 reversiones o 40 ensayos; válida si > 9 reversiones; media de las últimas 4 | Martín et al., 2020 | Procedimiento recomendado para 15–30 ensayos con dwell |
| Puntos de escalera de Levitt | 2-down/1-up → 70,7 %; 3-down/1-up → 79,4 % | Levitt, 1971 | Si la tarea no es un 50 % (p. ej. umbral de disparidad RDS) |
| Psi (umbral + pendiente) | Estima ambos parámetros; más exigente en ensayos | Kontsevich y Tyler, 1999 | No como primera opción en el visor |
| RDS clásico (ejemplo de Julesz) | 99×105 pts; cuadrado 40×40; disparidad 4 elementos | Julesz, 1960 | Geometría de estímulo 3D ciclópeo |
| Disparidad mín. ≈ 1 px en Cardboard | 124–157 arcsec (ppi 430–543, modelo del paper) | Bonfanti et al., 2015 | Tamizaje grueso; reportar arcsec del dispositivo |
| Estereoagudeza “excelente” de referencia en Bonfanti | ≈ 60 arcsec | Bonfanti et al., 2015 | El Cardboard típico **no llega** a ese piso con 1 px |
| Pulfrich | Filtro ND (o retraso) en un ojo + movimiento lateral → elipse en profundidad | Pulfrich, 1922; Tredici y von Noorden, 1984 | Módulo 3D de movimiento; no equivale a un RDS |
| Hollow-face y estereopsis | La disparidad ayuda a desambiguar a distancias cortas; la magnitud de disparidad sigue afectando la profundidad aparente aunque se invierta el orden | Hill y Bruce, 1993; Matthews et al., 2011 | Comparar escena 3D mono vs estéreo |
| Ames y binocularidad | La ilusión disminuye con más acceso visual pero puede persistir; en un cuarto miniatura, la visión binocular restauró casi toda la constancia; la disparidad no siempre anula la perspectiva | Gehringer y Engel, 1986; Dorward y Day, 1997; Rogers, 2022 | Módulo 3D de escala; 3DoF sin paralaje de traslación |
| Ponzo ciclópeo | La ilusión sobrevive en RDS; su magnitud depende de si el inductor está delante o detrás | Patterson y Fox, 1983 | Corredor 3D |
| k1, k2 oficiales Cardboard | 0,33582564 y 0,55348791 | Google manufacturer help | Default **calibrable**; no asumirlos en la caja genérica |
| Geometría oficial Cardboard | Pantalla–lente 39,3 mm; inter-lentes 63,9 mm | Google manufacturer help | Default; medir la caja real si se puede |
| Modelo de distorsión | p' = p (1 + k1 r² + k2 r⁴ + …), r en tan-ángulo | Google VR `Distortion` API | Shader de pre-distorsión vía RTT |
| FOV por defecto del SDK | Semiángulos 45° (y “50° o más” en la guía de fabricante) | Google SDK / manufacturer help | Cálculo angular declarado |
| Virtual Chinrest | Error medio de distancia 3,25 cm; card task + punto ciego a 13,5° | Li et al., 2020 | Calibrar PPI en pantalla **antes** del visor |
| Gaze dwell | ≈ 1,5 s (decisión de diseño del proyecto) | Especificación del prototipo, no un paper | Picking por rayo central (capítulo *Picking*) |

---

## 4. Mapeo con el cuaderno del curso (`vcnotebook`)

Las ocho rutas pedidas **existen** y se leyeron desde el despliegue actual de GitLab Pages (`get_pages_content`, proyecto `83862116`). Título exacto, URL canónica y conexión con los módulos 3D de Ojo a Ojo:

### 4.1 Stereo — `https://vcnotebook.gitlab.io/docs/immersive/stereo/`

**Título:** Stereo – Visual Computing  

La proyección aplana y pierde la profundidad a lo largo del rayo de vista; **dos imágenes** la recuperan porque el sistema visual lee la **disparidad horizontal**. El patrón de implementación del profesor es: partir la cámara a lo largo de su **eje derecho**, desplazar ±IPD/2, hacer *toe-in* a un punto de convergencia compartido, renderizar cada ojo a un FBO y multiplexar. El demo didáctico multiplexa en anaglifo rojo–cian o en *side-by-side*, con controles `ipd` (en el demo: 0–40, default 14 en unidades de la figura), `convDist` (80–700, default 340), `sideBySide` y `swapEyes`. Poner `ipd = 0` colapsa la profundidad; desplazar la convergencia mueve el **plano de disparidad cero**.

**Conexión con Ojo a Ojo:** es el corazón del visor. En Cardboard el multiplex no es anaglifo, sino **split de pantalla + lentes**. El IPD del demo se convierte en **separación virtual de cámaras**, calibrable porque la caja no ajusta IPD físico. `ipd = 0` (o la misma imagen en ambos ojos) es el modo monocular con el que se contrastan Ames, máscara hueca y Ponzo. Las superficies RDS son disparidad pura, como en Julesz. El *toe-in* del cuaderno es una elección didáctica; en un HMD suele preferirse un frustum **off-axis** (cámaras paralelas, proyección desplazada) para reducir disparidad vertical. El informe puede contrastar ambas, usando la teoría de proyección del cuaderno.

### 4.2 Viewpoint — `https://vcnotebook.gitlab.io/docs/immersive/viewpoint/`

**Título:** Viewpoint – Visual Computing  

El capítulo monta la cámara en un cuerpo: el frame `E` de un nodo se lee como **ojo** (`lookAt` / matriz de vista) o como **cuerpo** (frustum dibujado en el mundo). “La única cosa que decide entre las dos lecturas es qué frame se usa como eye matrix.”

**Conexión:** el giroscopio del celular (3DoF) actualiza ese frame-ojo. No hay traslación trackeada, así que Ames y el corredor Ponzo se observan desde un centro aproximadamente fijo (el *peephole* de la proyección). El mismo frame define el **rayo central** del gaze dwell.

### 4.3 Projection — `https://vcnotebook.gitlab.io/docs/foundations/projection/`

**Título:** Projection – Visual Computing  

La perspectiva lineal es “una ilusión deliberada”: el volumen de vista se lleva a un cubo NDC \([-1,1]^3\); el cuadro plano descarta la profundidad “y con ella la razón tamaño–distancia que ninguna imagen puede reportar”. La construcción es exacta **solo desde su centro**; desde cualquier otro punto es una anamorfosis. El cuaderno lo liga al **orificio de Brunelleschi**, que fija el ojo en ese centro.

**Conexión (muy directa con Ames y Ponzo):** el cuarto de Ames *es* esa anamorfosis arquitectónica (Ittelson, 1952; Rogers, 2022). El Cardboard, al inmovilizar aproximadamente el punto de vista (3DoF sin tracking de posición), reproduce la lógica del *peephole*. La disparidad estéreo es el cue adicional que el capítulo de Stereo reintroduce. La razón tamaño–distancia es el lenguaje común de Ames y del corredor Ponzo.

### 4.4 Color Ops — `https://vcnotebook.gitlab.io/docs/shading/color_ops/`

**Título:** Color Ops – Visual Computing  

Los bytes almacenados están en **sRGB**, no en luz. El cuaderno exige la transferencia sRGB a trozos (no el atajo de potencia 2,2):

```glsl
vec3 srgb2lin(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 lin2srgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}
```

La exposición es un producto en lineal; tono y saturación, en espacio de display.

**Conexión:** el punto de balance dicóptico (Ding y Sperling; Kwon; Birch; Martín) y el filtro ND del Pulfrich son operaciones **sobre luz**. Hacerlas sobre bytes sRGB falsea el contraste. Además, la no calibración de luminancia del celular es un límite de tamizaje que el informe debe declarar, con este capítulo como respaldo teórico del curso.

### 4.5 Particles — `https://vcnotebook.gitlab.io/docs/geometry/particles/`

**Título:** Particles – Visual Computing  

*Instancing:* una malla, un `draw` con conteo `n`, y el vertex shader usa `gl_InstanceID` (u equivalente en Three.js) para posición y color. El demo llega a miles de copias (el panel del cuaderno: 100–6000, default 1400).

**Conexión:** RDS de Julesz, ruido dinámico tipo Pulfrich (cilindro de ruido) y enjambres dicópticos tipo Narasimhan et al. (2012) se implementan como partículas instanciadas o como puntos procedimentales en GLSL, no como mil meshes sueltos en el CPU.

### 4.6 Render to texture — `https://vcnotebook.gitlab.io/docs/archetypes/render-to-texture/`

**Título:** Render to texture – Visual Computing  

Una escena se dibuja a un FBO y una **segunda pasada** la muestrea como textura. Es “the single-FBO round-trip, the primitive every post-processing effect and multi-pass pipeline is built on.” El demo didáctico pixeliza haciendo snap del UV al centro de un bloque (8–60 bloques, default 50).

**Conexión:** (1) render de cada ojo a textura, como ya hace *Stereo*; (2) **pre-distorsión de barril** en el fragment shader de la segunda pasada, con k1/k2 del modelo Brown-Conrady / Cardboard SDK; (3) posibles modos de composición monocular, swap de ojos, o atenuación de un ojo para Pulfrich y para el rebalanceo de contraste.

### 4.7 Picking — `https://vcnotebook.gitlab.io/docs/visibility/picking/`

**Título:** Picking – Visual Computing  

El pipeline forward tira profundidad e identidad. El picking invierte la pregunta: el cursor está en un píxel, que es el extremo cercano de un **rayo** que atraviesa la escena; gana la **superficie más cercana** (visibilidad). El cuaderno contrapone un test barato de proximidad en espacio de pantalla (origen proyectado + radio en píxeles lógicos; el demo usa un tamaño de zona de 30–160, default 80) con un picking exacto que sí respeta la silueta y la oclusión.

**Conexión:** dentro del visor no hay mouse. El “cursor” es el **centro del viewport** (puntero de mirada). Un raycast desde ese centro, más un temporizador de dwell ≈ 1,5 s, es la interacción. La zona de proximidad del cuaderno sugiere un cono o radio angular de aceptación, para que el dwell no exija puntería imposible con un gyro ruidoso.

### 4.8 three.js — `https://vcnotebook.gitlab.io/docs/annexes/frameworks/three-js/`

**Título:** three.js – Visual Computing  

Three.js es el *scene-graph host*: se construye `Mesh` + `Scene` y `renderer.render(scene, camera)` recorre el grafo. `ShaderMaterial` antepone `#version 300 es` y las declaraciones de precisión, e inyecta el vocabulario `position`, `color`, `projectionMatrix`, `modelViewMatrix`, `normalMatrix`. El cuaderno insiste en reescribir los shaders contra esos nombres, no contra los del host “crudo” de Archetypes. También documenta `glslVersion: GLSL3` y `side: THREE.DoubleSide` cuando hace falta.

**Conexión:** todo Ojo a Ojo vive aquí: dos cámaras o un `makeStereoCamera` / vista partida, `ShaderMaterial` explícitos para (a) pre-distorsión, (b) contraste/luminancia lineal por ojo, (c) RDS/partículas, (d) Pulfrich. Cumple el requisito del curso de GLSL explícito sin abandonar el framework que el cuaderno enseña.

### 4.9 Home del cuaderno (contexto del curso)

**Título:** Visual Computing Notebook – Visual Computing  
**URL:** https://vcnotebook.gitlab.io/docs/  

El cuaderno, de Jean Pierre Charalambos, enseña el pipeline de rasterización con visualizaciones interactivas. La capa *Apps / Immersive* incluye precisamente stereo (y WebXR). Eso justifica, en el reporte, que Ojo a Ojo no es un “add-on clínico” ajeno al curso, sino una aplicación de Stereo + Viewpoint + RTT + Picking + Color Ops + Particles sobre Three.js.

---

## 5. Arquitectura sugerida de módulos 3D (literatura → implementación)

Estos módulos son una lectura de diseño, no un protocolo clínico.

1. **Calibración en pantalla plana (antes del visor).** Tarea de tarjeta / PPI (Li et al., 2020) + alineación tipo nonius dicóptico (Martín et al., 2020) + IPD virtual subjetivo (el usuario fusiona marcas hasta un percepto cómodo). Medir, si se puede, la geometría real de la caja; si no, partir de k1/k2 y 63,9 mm oficiales y dejarlos editables.
2. **Máscara hueca 3D.** Comparar estéreo vs monocular; luz desde arriba; juicio de convexo/cóncavo o de profundidad aparente (Hill y Bruce, 1993; Matthews et al., 2011; Gregory, 1970 como marco). Encaje fuerte en 3DoF.
3. **Cuarto de Ames 3D (o habitación trapezoidal a escala).** Dos figuras de igual tamaño en las esquinas; modo mono vs estéreo. Interpretar solo el *cambio* de la ilusión de escala (Gehringer y Engel, 1986; Dorward y Day, 1997; Ittelson, 1952; Rogers, 2022; capítulo *Projection*).
4. **Corredor Ponzo 3D.** Dos objetos de igual tamaño a distinta profundidad pictórica; manipular también la disparidad del contexto (Patterson y Fox, 1983; Julesz, 1971).
5. **Superficie o volumen RDS 3D.** Forma ciclópea (delante/detrás o cuál figura), disparidades de varios píxeles, escalera de Levitt o 1-up/1-down (Julesz, 1960; Bonfanti et al., 2015; Webber et al., 2020).
6. **Objeto 3D de contraste dicóptico (balance point).** Partes o iluminancia distintas por ojo en un mismo objeto/escena; escalera 1-up/1-down al estilo Martín et al. (2020); reportar un IR, no un diagnóstico (Ding y Sperling, 2006; Mansouri et al., 2008; Li et al., 2011, 2013; Kwon et al., 2015; Birch et al., 2016).
7. **Pulfrich 3D.** Péndulo u objeto en movimiento; atenuación lineal (shader) o retraso en un ojo; reportar el sentido de la elipse (Pulfrich, 1922; Tredici y von Noorden, 1984). Interpretar junto al RDS, no en su lugar (Thompson y Wood, 1993).
8. **Rivalidad / fusión en un objeto 3D.** Texturas o colores incompatibles por ojo (Brascamp et al., 2015). Módulo cualitativo de predominancia.

Interacción unificada: puntero central + raycast + dwell ≈ 1,5 s (*Picking* + *Viewpoint*). Pre-distorsión por ojo (*Render to texture* + SDK Cardboard). Contrastes en lineal (*Color Ops*).

---

## 6. Límites y alcance de tamizaje (texto reutilizable en el informe)

Ojo a Ojo es un **prototipo de tamizaje visual / primer filtro** construido con ilusiones 3D en un visor de cartón y un celular de consumo. No puede, y no debe, presentarse como:

- un diagnóstico de ambliopía, supresión, estrabismo o estereoceguera;
- un medidor clínico de estereoagudeza (el piso de 1 píxel en Cardboard típico queda, según Bonfanti et al., 2015, en torno a 120–160 arcsec);
- un sustituto de agudeza visual, refracción, cover test o Worth 4-dot en consulta;
- una terapia dicóptica validada (los ECA de iPad, p. ej. Holmes et al., 2016, ya muestran un panorama mixto incluso en contextos clínicos).

Factores que pueden producir un “fail” sin que haya ambliopía: IPD virtual mal calibrado, k1/k2 inadecuados para las lentes reales, crosstalk del tabique de cartón, gamma/luminancia no calibradas, error refractivo no corregido, fatiga, mal tracking 3DoF, incomprensión de la tarea, o una ilusión (Ames, máscara hueca, Ponzo) que **persiste también en visión binocular normal** (Gehringer y Engel, 1986; Rogers, 2022; Patterson y Fox, 1983). Por eso el valor del prototipo está en el **patrón entre módulos** (p. ej. RDS ausente + Pulfrich presente, o ilusión de Ames igual en mono y en estéreo + balance de contraste muy desviado), no en un umbral único.

Cualquier resultado se informa como **indicio para consulta optométrica/oftalmológica**, nunca como conclusión clínica.

---

## 7. Vacíos, matices y fallos de esta revisión

- **No se verificó un “Li et al. 2010”** de medición dicóptica de supresión. En 2010 el paper de esa línea es Hess, Mansouri y Thompson. Li et al. sí están verificados en 2011 (IOVS) y 2013 (Ophthalmology).
- **Kwon et al. 2014** existe como resumen de congreso (VSS / *Journal of Vision*); el artículo completo con métodos y el 19 % / BP por frecuencia es **Kwon et al., 2015**, *Scientific Reports*.
- **Julesz (1971)** y **Ittelson (1952)** y **Gregory (1970)** son monografías: se verificó su existencia editorial (editoriales, ISBN o citación académica reiterada), no se extractaron números de página de un PDF propio. Los parámetros cuantitativos se tomaron de artículos con DOI.
- **Day (1993),** *The Ames room from another viewpoint* (*Perception*, 22, 1007–1011, https://doi.org/10.1068/p221007) está verificado bibliográficamente, pero no se usó como fuente de parámetros porque no se revisó el texto completo en esta pasada.
- Un candidato a DOI para Kelly et al. (2016), *Binocular iPad game vs patching* (`10.1001/jamaophthalmol.2016.4257`), **devolvió 404 en Crossref**; no se cita esa referencia hasta tener un DOI confirmado. El ECA grande de Holmes et al. (2016), con Birch de coautora, sí está verificado.
- **Greene y Gentner (2001)** sobre ilusiones de tamaño en autostereogramas Ponzo/corredor apareció en un índice (PMID 11693687) pero no se cerró aquí su ficha Crossref completa; no se cita en el cuerpo para no arriesgar revista/páginas.
- **OpenAlex y parte de Semantic Scholar** devolvieron HTTP 429 (rate limit) durante la recolección; la verificación se hizo por Crossref (DOI a DOI), PubMed eUtils, Exa y páginas del editor.
- Las ocho rutas de `vcnotebook` **respondieron bien** (HTML completo en GitLab Pages). No hubo rutas faltantes de la lista pedida.
- No se midió el crosstalk ni los k1/k2 de la caja concreta de Camilo: los valores oficiales son un **default a calibrar**.
- No se atribuye al gaze dwell de 1,5 s un paper de validación; es un parámetro de diseño del proyecto.

---

## 8. Método de verificación (transparencia)

- API Crossref (`https://api.crossref.org/works/{doi}` y búsquedas bibliográficas), con reintentos pausados tras un 429 inicial.
- PubMed eUtils (esearch + esummary) para PMID, revista, páginas y DOI.
- Exa (`web_search_exa`, `web_fetch_exa`) para localizar textos, PMC y documentación.
- Documentación oficial de Google Cardboard (Manufacturer Help y API `Distortion`).
- Cuaderno del curso: conector `user-GitLab` / herramienta `get_pages_content` sobre `https://vcnotebook.gitlab.io/docs/…`.
- Catálogos para monografías: Open British National Bibliography / Open Library (Gregory, 1970).

Cualquier cifra que en el informe se presente como “clínica” debe rastrearse a una fila de la tabla del §3. Si no está ahí, no se inventa.

---

*Fin del dossier. Uso exclusivo como insumo de propuesta y de reporte del Proyecto 3; no constituye asesoría clínica.*
