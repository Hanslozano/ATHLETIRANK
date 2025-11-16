import API from './api';

class AuthService {
    async register(userData) {
        try {
            const formData = new FormData();
            formData.append('username', userData.username);
            formData.append('email', userData.email);
            formData.append('password', userData.password);
            formData.append('role', userData.role);
            formData.append('universityId', userData.universityId);

            const response = await API.post('/auth/register', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Registration error:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    }

    async login(credentials) {
        try {
            const response = await API.post('/auth/login', credentials);
            console.log('Login response:', response.data); // Debug log
            
            // Handle the new response format from your updated backend
            const { token, user, success } = response.data;
            
            if (!success) {
                throw new Error(response.data.message || 'Login failed');
            }
            
            if (!token) {
                console.error('No token received from login');
                throw new Error('No authentication token received');
            }
            
            // Store token and user data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            console.log('Token stored:', token); // Debug log
            console.log('User stored:', user); // Debug log
            
            return { token, user };
        } catch (error) {
            console.error('Login error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Login failed');
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('User logged out, tokens cleared');
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            console.log('Current user from localStorage:', user); // Debug log
            return user;
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            this.logout(); // Clear corrupted data
            return null;
        }
    }

    isAuthenticated() {
        const token = localStorage.getItem('token');
        const user = this.getCurrentUser();
        const isAuth = !!(token && user);
        console.log('Authentication check:', { hasToken: !!token, hasUser: !!user, isAuth }); // Debug log
        return isAuth;
    }

    getToken() {
        const token = localStorage.getItem('token');
        console.log('Getting token:', token ? 'Token exists' : 'No token'); // Debug log
        return token;
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }

    isSportsCommittee() {
        const user = this.getCurrentUser();
        return user && user.role === 'sports_committee';
    }
}

export default new AuthService();