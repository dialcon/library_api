## Library Api (Node.js)
Aplicación monolítica para la gestión de libros,ejemplares y préstamos

## Prerequisitos
Para el correcto funcionamiento, se requiere la instalación global de nodemon

```bash
npm install -g nodemon
```
## Core
El directorio core contiene todo un módulo (que se puede externalizar) en el cual esá centralizada la comunicación con la la base de datos a manera de gateway, se requiere ingresar a ese directorio y seguir las instrucciones de esta sección:

Instalar las dependencias
```bash
npm i
```
Para la creación de la estructura de la base de datos basada en los modelos, se require ejecutar lo siguiente:
```bash
./package_start.sh 
```
Para ejecutar el gateway se ejecuta el siguiente archivo .sh
```bash
./gateway_start.sh 
```
## Create Project
El directorio create_project contiene todos los modelos que serán gestionados por el core, se requiere seguir las intrucciones solo la primera vez que se depliegue la app o cuando haya una modificiación o adición de un módulo (colección de mongo)

Ingresar al directorio create_project
```bash
npm i
```

```bash
node app.js 
```
### Configuration
- **Platform:** node
- **Framework**: express
- **Template Engine**: json
- **Unit Testing**: mocha
- **Database**: mongodb
- **Deployment**: none

### License
The MIT License (MIT)

