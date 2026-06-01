const cloudinary = require('./cloudinaryConfig');

cloudinary.api.ping()
.then(result => {

    console.log(result);

})
.catch(error => {

    console.log(error);

});
