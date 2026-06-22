// api/index.js - Para Node.js (CommonJS)
module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'API funcionando!',
    timestamp: new Date().toISOString()
  });
};
