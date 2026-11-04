// Thông báo lỗi của máy chủ viết bằng tiếng Việt. Khi trình duyệt gửi `X-Lang: en`,
// phần này dịch sang tiếng Anh trước khi trả về.
const EN = {
  'Bạn thao tác quá nhanh, hãy thử lại sau ít phút.': 'You are going too fast. Please try again in a few minutes.',
  'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.': 'Too many login attempts. Please try again in 15 minutes.',
  'Quá nhiều lần đăng ký từ địa chỉ này. Vui lòng thử lại sau.': 'Too many sign-ups from this address. Please try again later.',
  'Tải mã xác nhận quá nhiều lần.': 'Too many verification code requests.',
  'Yêu cầu không hợp lệ.': 'Invalid request.',
  'Chưa đăng nhập.': 'Not logged in.',
  'Phiên đăng nhập đã hết hạn.': 'Your session has expired.',
  'Đăng ký tài khoản mới đang tắt.': 'New sign-ups are turned off.',
  'Vui lòng thử lại.': 'Please try again.',
  'Mã xác nhận không đúng hoặc đã hết hạn.': 'The verification code is wrong or has expired.',
  'Tên đăng nhập 3–32 ký tự, chỉ gồm chữ thường, số, dấu _ và dấu chấm.':
    'Username must be 3–32 characters: lowercase letters, numbers, _ and dot.',
  'Mật khẩu phải từ 8 đến 72 ký tự.': 'Password must be 8 to 72 characters.',
  'Tên đăng nhập đã có người dùng.': 'That username is already taken.',
  'Tên đăng nhập hoặc mật khẩu không đúng.': 'Wrong username or password.',
  'Mật khẩu hiện tại không đúng.': 'Current password is wrong.',
  'Mật khẩu mới phải từ 8 đến 72 ký tự.': 'New password must be 8 to 72 characters.',
  'Không tìm thấy.': 'Not found.',
  'Dữ liệu gửi lên không hợp lệ.': 'The data sent is invalid.',
  'Dữ liệu quá lớn.': 'The data is too large.',
  'Có lỗi phía máy chủ, thử lại sau.': 'Server error. Please try again later.',
  'Tên thói quen từ 1 đến 60 ký tự.': 'Habit name must be 1 to 60 characters.',
  'Loại thói quen không hợp lệ.': 'Invalid habit type.',
  'Mục tiêu phải là số nguyên từ 0.': 'Target must be a whole number, 0 or more.',
  'Tối đa 30 thói quen đang theo dõi.': 'You can track up to 30 habits.',
  'Lịch lặp không hợp lệ.': 'Invalid schedule.',
  'Mục tiêu chuỗi không hợp lệ.': 'Invalid streak goal.',
  'Mức điểm không hợp lệ.': 'Invalid points level.',
  'Màu không hợp lệ.': 'Invalid color.',
  'Biểu tượng không hợp lệ.': 'Invalid icon.',
  'Không tìm thấy thói quen.': 'Habit not found.',
  'Danh sách không hợp lệ.': 'Invalid list.',
  'Ngày không hợp lệ.': 'Invalid date.',
  'Giá trị phải là số nguyên từ 0.': 'Value must be a whole number, 0 or more.',
  'Giá trị không hợp lệ.': 'Invalid value.',
  'Tâm trạng từ 1 đến 5.': 'Mood must be 1 to 5.',
  'Khoảng ngày không hợp lệ.': 'Invalid date range.',
  'Ghi chú không được để trống (tối đa 5000 ký tự).': 'A note cannot be empty (max 5000 characters).',
  'Không tìm thấy ghi chú.': 'Note not found.',
  'Tên việc từ 1 đến 120 ký tự.': 'A task name must be 1 to 120 characters.',
  'Tối đa 50 việc mỗi ngày.': 'You can add up to 50 tasks a day.',
  'Không tìm thấy việc này.': 'Task not found.',
};

const LOCK_RE = /^Tài khoản tạm khóa do nhập sai nhiều lần\. Thử lại sau (\d+) phút\.$/;

function translate(message) {
  if (EN[message]) return EN[message];
  const m = LOCK_RE.exec(message);
  if (m) return `Account temporarily locked after too many wrong attempts. Try again in ${m[1]} min.`;
  return message;
}

/** Middleware: dịch trường `error` của mọi phản hồi JSON khi người dùng chọn tiếng Anh. */
function langMiddleware(req, res, next) {
  if (req.get('X-Lang') === 'en') {
    const json = res.json.bind(res);
    res.json = (body) => {
      if (body && typeof body === 'object' && typeof body.error === 'string') {
        body = { ...body, error: translate(body.error) };
      }
      return json(body);
    };
  }
  next();
}

module.exports = { langMiddleware };
