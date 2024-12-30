import { Navigate } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode'; // Đảm bảo đã cài đặt jwt-decode

interface JwtPayload {
  isAdmin?: boolean;
  isStaff?: boolean;
  isUser?: boolean;
  exp?: number; // Thuộc tính `exp` để kiểm tra thời gian hết hạn của token
}

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const jwt = localStorage.getItem('jwt');

  // Kiểm tra nếu không có token JWT
  if (!jwt) {
    console.error('Token JWT không tồn tại. Chuyển hướng đến trang đăng nhập.');
    return <Navigate to="/dang-nhap" />;
  }

  try {
    // Giải mã token JWT
    const decoded = jwtDecode<JwtPayload>(jwt);
    console.log('Nội dung JWT giải mã:', decoded);

    // Kiểm tra thời gian hết hạn của token
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.error('Token JWT đã hết hạn. Chuyển hướng đến trang đăng nhập.');
      return <Navigate to="/dang-nhap" />;
    }

    // Kiểm tra quyền ADMIN hoặc STAFF
    if (!(decoded.isAdmin || decoded.isStaff)) {
      console.error('Người dùng không có quyền ADMIN hoặc STAFF. Chuyển hướng về trang chủ.');
      return <Navigate to="/" />;
    }

    // Nếu token hợp lệ và quyền đúng, cho phép truy cập
    return children;
  } catch (error) {
    console.error('Token JWT không hợp lệ:', error);
    return <Navigate to="/dang-nhap" />;
  }
};

export default AdminRoute;
