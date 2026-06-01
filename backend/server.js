const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('./cloudinaryConfig');

const {
    CloudinaryStorage
} = require('multer-storage-cloudinary');

const path = require('path');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

/* CREAR ALMACENAMIENTO CLOUDIANRY */

const storage = new CloudinaryStorage({

    cloudinary: cloudinary,

    params: async (req, file) => ({

        folder: 'Pinterest-Proyect',

        resource_type: 'auto'

    })

});

const upload = multer({

    storage

});


/* REGISTRO */

app.post('/registro', async (req, res) => {

    try {

        const { username, password } = req.body;

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO usuarios (username, password) VALUES ($1, $2)',
            [username, passwordHash]
        );

        res.json({
            mensaje: 'Usuario registrado'
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            error: 'Error al registrar'
        });

    }

});

/* LOGIN */

app.post('/login', async (req, res) => {

    try {

        const { username, password } = req.body;

        const resultado = await pool.query(
            'SELECT * FROM usuarios WHERE username = $1',
            [username]
        );

        if(resultado.rows.length === 0){

            return res.status(401).json({
                error:'Usuario no existe'
            });

        }

        const usuario = resultado.rows[0];

        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password
        );

        if(!passwordCorrecta){

            return res.status(401).json({
                error:'Contraseña incorrecta'
            });

        }

       res.json({
          mensaje:'Login correcto',
          usuario: usuario.username,
          usuario_id: usuario.id
       }); 


    } catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error en login'
        });

    }

});

/* CREAR PUBLICACION */

app.post(
    '/publicaciones',
    upload.single('archivo'),
    async (req, res) => {

    try {

        const {
            titulo,
            descripcion,
            categoria_id,
            usuario_id
        } = req.body;

        const archivo = req.file.path;

        const tipo = req.file.mimetype;

        await pool.query(

            `INSERT INTO publicaciones
            (
                titulo,
                descripcion,
                archivo,
                tipo,
                usuario_id,
                categoria_id
            )

            VALUES($1,$2,$3,$4,$5,$6)`,

            [
                titulo,
                descripcion,
                archivo,
                tipo,
                usuario_id,
                categoria_id
            ]

        );

        res.json({
            mensaje:'Publicación creada'
        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error al crear publicación'
        });

    }

});


/* BUSCAR PUBLICACIONES */

app.get('/buscar/:categoria', async (req, res) => {

    try {

        const categoria =
            req.params.categoria;

        const resultado = await pool.query(

            `SELECT publicaciones.*,

            categorias.nombre AS categoria,

            COUNT(likes.id) AS total_likes

            FROM publicaciones

            LEFT JOIN categorias
            ON publicaciones.categoria_id = categorias.id

            LEFT JOIN likes
            ON publicaciones.id = likes.publicacion_id

            WHERE LOWER(categorias.nombre)
            LIKE LOWER($1)

            GROUP BY publicaciones.id,
            categorias.nombre

            ORDER BY publicaciones.fecha DESC`,

            [`%${categoria}%`]

        );

        res.json(resultado.rows);

    } catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error buscando publicaciones'
        });

    }

});


/* OBTENER PUBLICACIONES */

app.get('/publicaciones', async (req, res) => {

    try {

        const resultado = await pool.query(

            `SELECT publicaciones.*,

            categorias.nombre AS categoria,

            COUNT(likes.id) AS total_likes

            FROM publicaciones

            LEFT JOIN categorias
            ON publicaciones.categoria_id = categorias.id

            LEFT JOIN likes
            ON publicaciones.id = likes.publicacion_id

            GROUP BY publicaciones.id,
            categorias.nombre

            ORDER BY publicaciones.fecha DESC`

        );

        res.json(resultado.rows);

    } catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error obteniendo publicaciones'
        });

    }

});



/* DAR LIKE */

app.post('/like', async (req, res) => {

    try {

        const {
            usuario_id,
            publicacion_id
        } = req.body;

        await pool.query(

            `INSERT INTO likes
            (usuario_id, publicacion_id)

            VALUES($1,$2)`,

            [
                usuario_id,
                publicacion_id
            ]

        );

        res.json({
            mensaje:'Like agregado'
        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error dando like'
        });

    }

});


/* COMENTAR */

app.post('/comentario', async (req, res) => {

    try {

        const {
            comentario,
            usuario_id,
            publicacion_id
        } = req.body;

        await pool.query(

            `INSERT INTO comentarios
            (
                comentario,
                usuario_id,
                publicacion_id
            )

            VALUES($1,$2,$3)`,

            [
                comentario,
                usuario_id,
                publicacion_id
            ]

        );

        res.json({
            mensaje:'Comentario agregado'
        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error comentando'
        });

    }

});


/* OBTENER COMENTARIOS */

app.get(
    '/comentarios/:publicacion_id',

    async (req, res) => {

    try {

        const publicacion_id =
            req.params.publicacion_id;

        const resultado = await pool.query(

            `SELECT comentarios.*,
            usuarios.username

            FROM comentarios

            LEFT JOIN usuarios
            ON comentarios.usuario_id = usuarios.id

            WHERE publicacion_id = $1

            ORDER BY comentarios.id DESC`,

            [publicacion_id]

        );

        res.json(resultado.rows);

    } catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error obteniendo comentarios'
        });

    }

});


/* DESCARGAR DESDE CLOUDINARY */

app.get('/descargar/:id', async (req,res)=>{

    try{

        const id = req.params.id;

        const resultado = await pool.query(

            `SELECT archivo
             FROM publicaciones
             WHERE id = $1`,

            [id]

        );

        if(resultado.rows.length === 0){

            return res.status(404).json({
                error:'Publicación no encontrada'
            });

        }

        let url =
            resultado.rows[0].archivo;

        url = url.replace(

            '/upload/',

            '/upload/fl_attachment/'

        );

        res.redirect(url);

    }
    catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error descargando archivo'
        });

    }

});


/* PUBLICACIONES DE UN USUARIO */

app.get('/mis-publicaciones/:usuario_id', async (req,res)=>{

    try{

        const usuario_id = req.params.usuario_id;

        const resultado = await pool.query(

            `SELECT *

            FROM publicaciones

            WHERE usuario_id = $1

            ORDER BY fecha DESC`,

            [usuario_id]

        );

        res.json(resultado.rows);

    }
    catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error obteniendo publicaciones'
        });

    }

});

/*ESTADÍSTICAS */
app.get(
'/estadisticas/:usuario_id',

async(req,res)=>{

    try{

        const usuario_id =
            req.params.usuario_id;

        const publicaciones =
        await pool.query(

        `
        SELECT COUNT(*) total
        FROM publicaciones
        WHERE usuario_id=$1
        `,
        [usuario_id]

        );

        const likes =
        await pool.query(

        `
        SELECT COUNT(likes.id) total

        FROM likes

        INNER JOIN publicaciones
        ON likes.publicacion_id =
        publicaciones.id

        WHERE publicaciones.usuario_id=$1
        `,
        [usuario_id]

        );

        res.json({

            publicaciones:
            publicaciones.rows[0].total,

            likes:
            likes.rows[0].total

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({
            error:'Error'
        });

    }

});

/* ELIMINAR PUBLICACIÓN */
app.delete(
'/publicaciones/:id',

async(req,res)=>{

    try{

        const id =
        req.params.id;

        await pool.query(

            'DELETE FROM likes WHERE publicacion_id=$1',

            [id]

        );

        await pool.query(

            'DELETE FROM comentarios WHERE publicacion_id=$1',

            [id]

        );

        await pool.query(

            'DELETE FROM publicaciones WHERE id=$1',

            [id]

        );

        res.json({

            mensaje:
            'Publicación eliminada'

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({

            error:
            'Error eliminando publicación'

        });

    }

});

/* INICIAR SERVIDOR */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});
