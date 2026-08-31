export const METHOD = {
  nombre: 'Metódica de conversión CIM-PIM jMDA',
  version: '4.0',
  stages: [
    {
      id: 'requisitos',
      nombre: 'Modelo de Requisitos en Texto',
      nivel: 'CIM',
      tipo: 'texto',
      entrada: 'Descripción de la idea en lenguaje natural',
      salida: 'Documento de requisitos funcionales y no funcionales, actores y alcance',
      descripcion:
        'En esta etapa se clarifica la idea inicial del cliente y se obtiene un documento de requisitos que sirve de insumo para todo el PIM.'
    },
    {
      id: 'casos_uso',
      nombre: 'Modelo de Casos de Uso',
      nivel: 'CIM-PIM',
      tipo: 'plantuml',
      entrada: 'Modelo de Requisitos en Texto',
      salida: 'Actores, casos de uso, relaciones y diagrama de casos de uso en PlantUML',
      descripcion:
        'Se identifican los actores y los casos de uso del sistema, sus relaciones y se genera el diagrama de casos de uso.'
    },
    {
      id: 'clases',
      nombre: 'Modelo de Clases',
      nivel: 'PIM',
      tipo: 'plantuml',
      entrada: 'Modelo de Requisitos y Casos de Uso',
      salida: 'Clases, atributos, métodos, relaciones y diagrama de clases en PlantUML',
      descripcion:
        'Se modela la estructura estática del sistema: clases de dominio, atributos, operaciones y relaciones. Es el artefacto central del PIM.'
    },
    {
      id: 'secuencia',
      nombre: 'Modelo de Secuencia',
      nivel: 'PIM',
      tipo: 'plantuml',
      entrada: 'Casos de Uso y Clases',
      salida: 'Interacciones entre objetos y diagrama de secuencia en PlantUML',
      descripcion:
        'Se modela la interacción temporal entre los objetos para los escenarios más relevantes del sistema.'
    },
    {
      id: 'actividades',
      nombre: 'Modelo de Actividades',
      nivel: 'PIM',
      tipo: 'plantuml',
      entrada: 'Casos de Uso',
      salida: 'Flujos de trabajo y diagrama de actividades en PlantUML',
      descripcion:
        'Se modela el flujo de actividades y decisiones de los procesos clave del sistema.'
    }
  ]
};
