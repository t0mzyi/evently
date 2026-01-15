export const AloginGet = (req, res) => {
  res.render("admin/login");
};

export const AloginPost = (req, res) => {
  try {
    const { emailAddress, password } = req.body;
    if (emailAddress == "admin" && password == "1234") {
      req.session.isAdmin = true;
      return res.status(200).json({
        success: true,
        redirectUrl: "/admin/dash",
      });
    }

    return res.status(400).json({
      success: false,
      message: "INVALID CREDIANTIALS (s)",
    });
  } catch (Err) {
    console.log("err in aloginPost", Err.message);
  }
};
