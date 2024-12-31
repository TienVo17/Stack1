import React from "react";

function About() {
  return (
    <div className="w-100 h-100 d-flex align-items-center justify-content-center flex-column m-5">
      <div className="w-50 h-50 p-3 rounded-5 shadow-4-strong bg-light">
        <h3 className="text-center text-black">Giới thiệu về BookStore</h3>
        <hr />
        <div className="row">
          <div className="col-lg-8">
            <p><strong>Tên website: </strong>BookStore</p>
            <p><strong>Địa chỉ: </strong> 00000</p>
            <p><strong>Số điện thoại: </strong>000000</p>
            <p><strong>Email: </strong>000000</p>
          </div>
          <div className="col-lg-4">
            <div
              className="d-flex align-items-center justify-content-center rounded-5"
              style={{ border: "1px solid #ccc" }}
            >
              <img
                src={`${process.env.PUBLIC_URL}/image/books/logo.png`}
                width="100"
                alt="BookStore Logo"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-50 h-50 p-3 rounded-5 shadow-4-strong bg-light mt-3">
        <h3 className="text-center text-black">Google maps</h3>
        <hr />
        <div className="d-flex align-items-center justify-content-center">
          <iframe
            width="600"
            height="450"
            src=""
            style={{ border: "1px solid black" }}
            title="BookStore Location"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default About;
