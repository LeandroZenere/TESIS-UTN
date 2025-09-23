// Script para probar el API
// Ejecutar con: node test-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  try {
    console.log('🧪 Probando API de Gestión de Facturas\n');

    // 1. Probar endpoint principal
    console.log('1️⃣ Probando endpoint principal...');
    const homeResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ Endpoint principal:', homeResponse.data.message);

    // 2. Probar login con credenciales correctas
    console.log('\n2️⃣ Probando login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login exitoso');
      console.log('👤 Usuario:', loginResponse.data.data.user.username);
      console.log('🔐 Rol:', loginResponse.data.data.user.role);
      
      const token = loginResponse.data.data.token;
      
      // 3. Probar endpoint protegido
      console.log('\n3️⃣ Probando endpoint protegido...');
      const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (meResponse.data.success) {
        console.log('✅ Endpoint protegido funcionando');
        console.log('📋 Datos del usuario:', meResponse.data.data.user.full_name);
      }
      
    } else {
      console.log('❌ Login falló');
    }

    // 4. Probar login con credenciales incorrectas
    console.log('\n4️⃣ Probando login con credenciales incorrectas...');
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'admin',
        password: 'wrong-password'
      });
    } catch (error) {
      if (error.response.status === 401) {
        console.log('✅ Validación de credenciales funcionando correctamente');
      }
    }

    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    if (error.response) {
      console.error('📋 Detalles:', error.response.data);
    }
  }
}

// Ejecutar las pruebas
testAPI();