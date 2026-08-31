// Metódica de conversión CIM-PIM (fuente de prompts para la Edge Function).
// Espejo de llm_integration/prompts/method.json (versión TypeScript para Deno).

export const method = {
  nombre: 'Metódica de conversión CIM-PIM jMDA',
  version: '4.0',
  stages: [
    {
      id: 'requisitos',
      nombre: 'Modelo de Requisitos en Texto',
      nivel: 'CIM',
      orden: 0,
      tipo: 'texto',
      entrada: 'Descripción de la idea en lenguaje natural',
      salida: 'Documento de requisitos funcionales y no funcionales, actores y alcance',
      descripcion:
        'En esta etapa se clarifica la idea inicial del cliente y se obtiene un documento de requisitos que sirve de insumo para todo el PIM.',
      system:
        'Eres un analista de sistemas experto en levantamiento de requisitos para Sistemas de Información. Tu función es transformar una idea descrita en lenguaje natural por un cliente en un documento de requisitos claro, completo y bien estructurado, sin asumir detalles técnicos de implementación (plataforma, base de datos, framework).',
      format:
        'Responde ÚNICAMENTE en formato Markdown válido, sin texto fuera del markdown. Estructura la respuesta con los siguientes encabezados exactos:\n\n## Descripción General\n\n## Alcance del Sistema\n\n## Actores\n\n## Requisitos Funcionales\n\n## Requisitos No Funcionales\n\n## Supuestos y Restricciones\n\nCada requisito funcional y no funcional debe ser una lista numerada con una frase clara y verificable. No incluyas código ni diagramas.',
      prompt:
        'A partir de la siguiente descripción en lenguaje natural, elabora el documento de requisitos del Sistema de Información. Si la descripción es ambigua o incompleta, infiere los elementos más razonables para un sistema de ese tipo y anótalos como supuestos.\n\nDescripción:\n{requisitos}'
    },
    {
      id: 'casos_uso',
      nombre: 'Modelo de Casos de Uso',
      nivel: 'CIM-PIM',
      orden: 1,
      tipo: 'plantuml',
      entrada: 'Modelo de Requisitos en Texto',
      salida: 'Actores, casos de uso, relaciones y diagrama de casos de uso en PlantUML',
      descripcion:
        'Se identifican los actores y los casos de uso del sistema, sus relaciones (asociación, inclusión, extensión y generalización) y se genera el diagrama de casos de uso.',
      system:
        'Eres un analista de sistemas experto en UML. Identifica actores y casos de uso a partir de los requisitos, define sus relaciones y genera un diagrama de casos de uso correcto.',
      format:
        'Responde en Markdown con las secciones:\n\n## Actores y Casos de Uso\n- Lista de actores (nombre y descripción corta).\n- Lista numerada de casos de uso (nombre y resumen de una línea).\n\n## Relaciones\n- Lista de relaciones entre actores y casos de uso (incluir include/extend/generalización cuando aplique).\n\n## Diagrama PlantUML\nIncluye un único bloque de código marcado con ```plantuml que contenga el diagrama de casos de uso entre @startuml y @enduml.',
      prompt:
        'A partir de los siguientes requisitos, identifica los actores y casos de uso del sistema y genera el diagrama de casos de uso.\n\nRequisitos:\n{requisitos}'
    },
    {
      id: 'clases',
      nombre: 'Modelo de Clases',
      nivel: 'PIM',
      orden: 2,
      tipo: 'plantuml',
      entrada: 'Modelo de Requisitos y Casos de Uso',
      salida: 'Clases, atributos, métodos, relaciones y diagrama de clases en PlantUML',
      descripcion:
        'Se modela la estructura estática del sistema: clases de dominio, atributos, operaciones y relaciones (asociación, agregación, composición, herencia). Es el artefacto central del PIM.',
      system:
        'Eres un analista de sistemas experto en UML y modelado orientado a objetos. Identifica las clases de dominio, sus atributos, métodos y relaciones, generando un diagrama de clases independiente de la plataforma.',
      format:
        'Responde en Markdown con las secciones:\n\n## Clases\nPara cada clase indica: nombre, atributos (nombre: tipo) y operaciones.\n\n## Relaciones\nLista de relaciones con su tipo (asociación, agregación, composición, herencia) y multiplicidad cuando sea posible.\n\n## Diagrama PlantUML\nIncluye un único bloque de código marcado con ```plantuml que contenga el diagrama de clases entre @startuml y @enduml.',
      prompt:
        'A partir de los siguientes requisitos y casos de uso, elabora el diagrama de clases del sistema.\n\nRequisitos:\n{requisitos}'
    },
    {
      id: 'secuencia',
      nombre: 'Modelo de Secuencia',
      nivel: 'PIM',
      orden: 3,
      tipo: 'plantuml',
      entrada: 'Casos de Uso y Clases',
      salida: 'Interacciones entre objetos y diagrama de secuencia en PlantUML',
      descripcion:
        'Se modela la interacción temporal entre los objetos para los escenarios más relevantes del sistema.',
      system:
        'Eres un analista de sistemas experto en UML. A partir de los requisitos y las clases del sistema, identifica los escenarios principales y genera un diagrama de secuencia que muestre la interacción entre los participantes.',
      format:
        'Responde en Markdown con las secciones:\n\n## Escenarios\nDescribe brevemente 1 o 2 escenarios principales.\n\n## Diagrama PlantUML\nIncluye un único bloque de código marcado con ```plantuml que contenga el diagrama de secuencia entre @startuml y @enduml.',
      prompt:
        'A partir de los siguientes requisitos, genera el diagrama de secuencia para el escenario principal del sistema.\n\nRequisitos:\n{requisitos}'
    },
    {
      id: 'actividades',
      nombre: 'Modelo de Actividades',
      nivel: 'PIM',
      orden: 4,
      tipo: 'plantuml',
      entrada: 'Casos de Uso',
      salida: 'Flujos de trabajo y diagrama de actividades en PlantUML',
      descripcion:
        'Se modela el flujo de actividades y decisiones de los procesos clave del sistema.',
      system:
        'Eres un analista de sistemas experto en UML. A partir de los requisitos, identifica el proceso o flujo de trabajo principal del sistema y genera un diagrama de actividades.',
      format:
        'Responde en Markdown con las secciones:\n\n## Flujo de Actividades\nDescribe el proceso principal.\n\n## Diagrama PlantUML\nIncluye un único bloque de código marcado con ```plantuml que contenga el diagrama de actividades entre @startuml y @enduml.',
      prompt:
        'A partir de los siguientes requisitos, genera el diagrama de actividades del proceso principal del sistema.\n\nRequisitos:\n{requisitos}'
    }
  ]
};

export type Stage = (typeof method.stages)[number];
