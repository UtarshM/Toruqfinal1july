<?php
	// Set TimeZone 
	date_default_timezone_set('Asia/Kolkata');
	
	$protocol=((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off') || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
	$url=$protocol . $_SERVER['HTTP_HOST']."/torque_auto_advisor/"; 
	
	$project_title="Torque Auto Advisor";
	
	$meta_title="Torque Auto Advisor";
	
	$meta_keywords="Torque Auto Advisor";
	
	$meta_description="Torque Auto Advisor";
	
    $mail_del="asif.momin@kasanamedia.com";
	// $mail_del="info@financemanagement.com";
	
	// SMTP INFO
	$smtp_host="smtp.gmail.com";
	$smtp_user="corephpexpert@gmail.com";
	$smtp_password="core$123";
	$smtp_secure="tls";
	$smtp_port=587;
	// SMTP INFO
	
	$max_id= date("Y-m-d-H-i-s");
	
	function my_simple_crypt( $string, $action = 'e' ) {
		// you may change these values to your own
		$secret_key = 'my_simple_secret_key';
		$secret_iv = 'my_simple_secret_iv';
	 
		$output = false;
		$encrypt_method = "AES-256-CBC";
		$key = hash( 'sha256', $secret_key );
		$iv = substr( hash( 'sha256', $secret_iv ), 0, 16 );
	 
		if( $action == 'e' ) {
			$output = base64_encode( openssl_encrypt( $string, $encrypt_method, $key, 0, $iv ) );
		}
		else if( $action == 'd' ){
			$output = openssl_decrypt( base64_decode( $string ), $encrypt_method, $key, 0, $iv );
		}
		return $output;
	}
	  
	
	//  slider_image  Function  Start
	function resizeslider($width, $height, $max_id){
 	list($w, $h) = getimagesize($_FILES['slider_image']['tmp_name']);
 	$ratio = max($width/$w, $height/$h);
	$h = ceil($height / $ratio);
	$x = ($w - $width / $ratio) / 2;
	$w = ceil($width / $ratio);
	 
	$latest = $max_id.$_FILES['slider_image']['name']; 
 	$pathslider = '../img/org_slider_image/'.$width.'x'.$height.$latest;
 	$imgString = file_get_contents($_FILES['slider_image']['tmp_name']);
 	$slider_image = imagecreatefromstring($imgString);
	$tmp = imagecreatetruecolor($width, $height);
	imagecopyresampled($tmp, $slider_image,
	0, 0,
	$x, 0,
	$width, $height,
	$w, $h);
 	switch ($_FILES['slider_image']['type']) {
		case 'image/jpeg':
			imagejpeg($tmp, $pathslider, 100);
			break;
		case 'image/png':
			imagepng($tmp, $pathslider, 0);
			break;
		case 'image/gif':
			imagegif($tmp, $pathslider);
			break;
		default:
			exit;
			break;
	}
 	optimizeImageslider($pathslider);
	
	return $pathslider;
	
 	imagedestroy($slider_image);
		imagedestroy($tmp);
	}
 	function optimizeImageslider($image)
	{
 		$target_file = $image;
  		$path_slider = pathinfo($target_file);
		$dest_photo = "../img/slider_image/".$path_slider['basename'];
 		$quality = 90;
 		$info = getimagesize($target_file);

		if ($info['mime']		== 'image/jpeg') $image = imagecreatefromjpeg($target_file);
		elseif ($info['mime']	== 'image/jpg') $image = imagecreatefromjpeg($target_file);
		elseif ($info['mime']	== 'image/gif') $image = imagecreatefromgif($target_file);
		elseif ($info['mime']	== 'image/png') $image = imagecreatefrompng($target_file);
 		imagejpeg($image, $dest_photo, $quality);
 		return $dest_photo;
	}
//  slider_image  Function  End

//  member_image  Function  Start
function resizemember($width, $height, $max_id)
{
	list($w, $h) = getimagesize($_FILES['member_image']['tmp_name']);
	$ratio = max($width / $w, $height / $h);
	$h = ceil($height / $ratio);
	$x = ($w - $width / $ratio) / 2;
	$w = ceil($width / $ratio);

	$latest = $max_id . $_FILES['member_image']['name'];
	$pathmember = '../img/org_member_image/' . $width . 'x' . $height . $latest;
	$imgString = file_get_contents($_FILES['member_image']['tmp_name']);
	$member_image = imagecreatefromstring($imgString);
	$tmp = imagecreatetruecolor($width, $height);
	imagecopyresampled(
		$tmp,
		$member_image,
		0,
		0,
		$x,
		0,
		$width,
		$height,
		$w,
		$h
	);
	switch ($_FILES['member_image']['type']) {
		case 'image/jpeg':
			imagejpeg($tmp, $pathmember, 100);
			break;
		case 'image/png':
			imagepng($tmp, $pathmember, 0);
			break;
		case 'image/gif':
			imagegif($tmp, $pathmember);
			break;
		default:
			exit;
			break;
	}
	optimizeImagemember($pathmember);

	return $pathmember;

	imagedestroy($member_image);
	imagedestroy($tmp);
}
function optimizeImagemember($image)
{
	$target_file = $image;
	$path_member = pathinfo($target_file);
	$dest_photo = "../img/member_image/" . $path_member['basename'];
	$quality = 90;
	$info = getimagesize($target_file);

	if ($info['mime']		== 'image/jpeg') $image = imagecreatefromjpeg($target_file);
	elseif ($info['mime']	== 'image/jpg') $image = imagecreatefromjpeg($target_file);
	elseif ($info['mime']	== 'image/gif') $image = imagecreatefromgif($target_file);
	elseif ($info['mime']	== 'image/png') $image = imagecreatefrompng($target_file);
	imagejpeg($image, $dest_photo, $quality);
	return $dest_photo;
}
	//  member_image  Function  End

	//  sign_image  Function  Start
function resizesign($width, $height, $max_id)
{
	list($w, $h) = getimagesize($_FILES['sign_image']['tmp_name']);
	$ratio = max($width / $w, $height / $h);
	$h = ceil($height / $ratio);
	$x = ($w - $width / $ratio) / 2;
	$w = ceil($width / $ratio);

	$latest = $max_id . $_FILES['sign_image']['name'];
	$pathsign = '../img/org_sign_image/' . $width . 'x' . $height . $latest;
	$imgString = file_get_contents($_FILES['sign_image']['tmp_name']);
	$sign_image = imagecreatefromstring($imgString);
	$tmp = imagecreatetruecolor($width, $height);
	imagecopyresampled(
		$tmp,
		$sign_image,
		0,
		0,
		$x,
		0,
		$width,
		$height,
		$w,
		$h
	);
	switch ($_FILES['sign_image']['type']) {
		case 'image/jpeg':
			imagejpeg($tmp, $pathsign, 100);
			break;
		case 'image/png':
			imagepng($tmp, $pathsign, 0);
			break;
		case 'image/gif':
			imagegif($tmp, $pathsign);
			break;
		default:
			exit;
			break;
	}
	optimizeImagesign($pathsign);

	return $pathsign;

	imagedestroy($sign_image);
	imagedestroy($tmp);
}
function optimizeImagesign($image)
{
	$target_file = $image;
	$path_sign = pathinfo($target_file);
	$dest_photo = "../img/sign_image/" . $path_sign['basename'];
	$quality = 90;
	$info = getimagesize($target_file);

	if ($info['mime']		== 'image/jpeg') $image = imagecreatefromjpeg($target_file);
	elseif ($info['mime']	== 'image/jpg') $image = imagecreatefromjpeg($target_file);
	elseif ($info['mime']	== 'image/gif') $image = imagecreatefromgif($target_file);
	elseif ($info['mime']	== 'image/png') $image = imagecreatefrompng($target_file);
	imagejpeg($image, $dest_photo, $quality);
	return $dest_photo;
}
	//  sign_image  Function  End
	
	//  brand_image  Function  Start
	function resizebrand($width, $height, $max_id){
 	list($w, $h) = getimagesize($_FILES['brand_image']['tmp_name']);
 	$ratio = max($width/$w, $height/$h);
	$h = ceil($height / $ratio);
	$x = ($w - $width / $ratio) / 2;
	$w = ceil($width / $ratio);
	 
	$latest = $max_id.$_FILES['brand_image']['name']; 
 	$pathbrand = '../img/org_brand_image/'.$width.'x'.$height.$latest;
 	$imgString = file_get_contents($_FILES['brand_image']['tmp_name']);
 	$brand_image = imagecreatefromstring($imgString);
	$tmp = imagecreatetruecolor($width, $height);
	imagecopyresampled($tmp, $brand_image,
	0, 0,
	$x, 0,
	$width, $height,
	$w, $h);
 	switch ($_FILES['brand_image']['type']) {
		case 'image/jpeg':
			imagejpeg($tmp, $pathbrand, 100);
			break;
		case 'image/png':
			imagepng($tmp, $pathbrand, 0);
			break;
		case 'image/gif':
			imagegif($tmp, $pathbrand);
			break;
		default:
			exit;
			break;
	}
 	optimizeImagebrand($pathbrand);
	
	return $pathbrand;
	
 	imagedestroy($brand_image);
		imagedestroy($tmp);
	}
 	function optimizeImagebrand($image)
	{
 		$target_file = $image;
  		$path_brand = pathinfo($target_file);
		$dest_photo = "../img/brand_image/".$path_brand['basename'];
 		$quality = 90;
 		$info = getimagesize($target_file);

		if ($info['mime']		== 'image/jpeg') $image = imagecreatefromjpeg($target_file);
		elseif ($info['mime']	== 'image/jpg') $image = imagecreatefromjpeg($target_file);
		elseif ($info['mime']	== 'image/gif') $image = imagecreatefromgif($target_file);
		elseif ($info['mime']	== 'image/png') $image = imagecreatefrompng($target_file);
 		imagejpeg($image, $dest_photo, $quality);
 		return $dest_photo;
	}
	//  brand_image  Function  End
	
	//  category_image  Function  Start
	function resizecategory($width, $height, $max_id){
 	list($w, $h) = getimagesize($_FILES['category_image']['tmp_name']);
 	$ratio = max($width/$w, $height/$h);
	$h = ceil($height / $ratio);
	$x = ($w - $width / $ratio) / 2;
	$w = ceil($width / $ratio);
	 
	$latest = $max_id.$_FILES['category_image']['name']; 
 	$pathcategory = '../img/org_category_image/'.$width.'x'.$height.$latest;
 	$imgString = file_get_contents($_FILES['category_image']['tmp_name']);
 	$category_image = imagecreatefromstring($imgString);
	$tmp = imagecreatetruecolor($width, $height);
	imagecopyresampled($tmp, $category_image,
	0, 0,
	$x, 0,
	$width, $height,
	$w, $h);
 	switch ($_FILES['category_image']['type']) {
		case 'image/jpeg':
			imagejpeg($tmp, $pathcategory, 100);
			break;
		case 'image/png':
			imagepng($tmp, $pathcategory, 0);
			break;
		case 'image/gif':
			imagegif($tmp, $pathcategory);
			break;
		default:
			exit;
			break;
	}
 	optimizeImagecategory($pathcategory);
	
	return $pathcategory;
	
 	imagedestroy($category_image);
		imagedestroy($tmp);
	}
 	function optimizeImagecategory($image)
	{
 		$target_file = $image;
  		$path_category = pathinfo($target_file);
		$dest_photo = "../img/category_image/".$path_category['basename'];
 		$quality = 90;
 		$info = getimagesize($target_file);

		if ($info['mime']		== 'image/jpeg') $image = imagecreatefromjpeg($target_file);
		elseif ($info['mime']	== 'image/jpg') $image = imagecreatefromjpeg($target_file);
		elseif ($info['mime']	== 'image/gif') $image = imagecreatefromgif($target_file);
		elseif ($info['mime']	== 'image/png') $image = imagecreatefrompng($target_file);
 		imagejpeg($image, $dest_photo, $quality);
 		return $dest_photo;
	}
	//  category_image  Function  End
	
	//  product_image  Function  Start
	function resizeproduct($width, $height, $max_id){
 	list($w, $h) = getimagesize($_FILES['product_image']['tmp_name']);
 	$ratio = max($width/$w, $height/$h);
	$h = ceil($height / $ratio);
	$x = ($w - $width / $ratio) / 2;
	$w = ceil($width / $ratio);
	 
	$latest = $max_id.$_FILES['product_image']['name']; 
 	$pathproduct = '../img/org_product_image/'.$width.'x'.$height.$latest;
 	$imgString = file_get_contents($_FILES['product_image']['tmp_name']);
 	$product_image = imagecreatefromstring($imgString);
	$tmp = imagecreatetruecolor($width, $height);
	imagecopyresampled($tmp, $product_image,
	0, 0,
	$x, 0,
	$width, $height,
	$w, $h);
 	switch ($_FILES['product_image']['type']) {
		case 'image/jpeg':
			imagejpeg($tmp, $pathproduct, 100);
			break;
		case 'image/png':
			imagepng($tmp, $pathproduct, 0);
			break;
		case 'image/gif':
			imagegif($tmp, $pathproduct);
			break;
		default:
			exit;
			break;
	}
 	optimizeImageproduct($pathproduct);
	
	return $pathproduct;
	
 	imagedestroy($product_image);
		imagedestroy($tmp);
	}
 	function optimizeImageproduct($image)
	{
 		$target_file = $image;
  		$path_product = pathinfo($target_file);
		$dest_photo = "../img/product_image/".$path_product['basename'];
 		$quality = 90;
 		$info = getimagesize($target_file);

		if ($info['mime']		== 'image/jpeg') $image = imagecreatefromjpeg($target_file);
		elseif ($info['mime']	== 'image/jpg') $image = imagecreatefromjpeg($target_file);
		elseif ($info['mime']	== 'image/gif') $image = imagecreatefromgif($target_file);
		elseif ($info['mime']	== 'image/png') $image = imagecreatefrompng($target_file);
 		imagejpeg($image, $dest_photo, $quality);
 		return $dest_photo;
	}
	//  product_image  Function  End

	 
	 
	 //  Image crop & save Function Start resizedocument
	function resizedocument($width, $height, $max_id, $img_name, $tmp, $img_type)
	{
		/* Get original image x y*/
		list($w, $h) = getimagesize($tmp);
		/* calculate new image size with ratio */
		$ratio = max($width/$w, $height/$h);
		$h = ceil($height / $ratio);
		$x = ($w - $width / $ratio) / 2;
		$w = ceil($width / $ratio);
		/* new file name */
		/*$max_id = $con->maxid("document_detail","document_id","document_id"); */
		// echo $max_id; exit;
		$latest = $max_id.$img_name; 
		// echo $latest; exit;
		//  date("Y-m-d H:i:s")
		$path = '../img/document_image/'.$width.'x'.$height.$latest;
		/* read binary data from image file */
		$imgString = file_get_contents($tmp);
		/* create image from string */
		$document_image = imagecreatefromstring($imgString);
		$tmp = imagecreatetruecolor($width, $height);
		imagecopyresampled($tmp, $document_image,
		0, 0,
		$x, 0,
		$width, $height,
		$w, $h);
		/* Save image */
		switch ($img_type) {
			case 'image/jpeg':
				imagejpeg($tmp, $path, 100);
				break;
			case 'image/png':
				imagepng($tmp, $path, 0);
				break;
			case 'image/gif':
				imagegif($tmp, $path);
				break;
			default:
				exit;
				break;
		}
		return $path;
		/* cleanup memory */
		imagedestroy($document_image);
		imagedestroy($tmp);
	}
	//  Image crop & save Function  End resizedocument

	//  Image crop & save Function Start resizedoc
	function resizedoc($width, $height, $max_id){
	/* Get original image x y*/
	list($w, $h) = getimagesize($_FILES['document_image']['tmp_name']);
	/* calculate new image size with ratio */
	$ratio = max($width/$w, $height/$h);
	$h = ceil($height / $ratio);
	$x = ($w - $width / $ratio) / 2;
	$w = ceil($width / $ratio);
	/* new file name */
	/*$max_id = $con->maxid("document_detail","document_id","document_id"); */
	// echo $max_id; exit;
	$latest = $max_id.$_FILES['document_image']['name']; 
	// echo $latest; exit;
	//  date("Y-m-d H:i:s")
	$path = '../img/document_image/'.$width.'x'.$height.$latest;
	/* read binary data from image file */
	$imgString = file_get_contents($_FILES['document_image']['tmp_name']);
	/* create image from string */
	$document_image = imagecreatefromstring($imgString);
	$tmp = imagecreatetruecolor($width, $height);
	imagecopyresampled($tmp, $document_image,
	0, 0,
	$x, 0,
	$width, $height,
	$w, $h);
	/* Save image */
	switch ($_FILES['document_image']['type']) {
		case 'image/jpeg':
			imagejpeg($tmp, $path, 100);
			break;
		case 'image/png':
			imagepng($tmp, $path, 0);
			break;
		case 'image/gif':
			imagegif($tmp, $path);
			break;
		default:
			exit;
			break;
	}
	return $path;
	/* cleanup memory */
	imagedestroy($document_image);
		imagedestroy($tmp);
	}
    //  Image crop & save Function End resizedoc

	//resize and crop image by center  ********* ///////////////// ----------- ++++++++++++++++++ 
		function resize_crop_image($max_width, $max_height, $source_file, $dst_dir, $quality = 80){
		$imgsize = getimagesize($source_file);
		$width = $imgsize[0];
		$height = $imgsize[1];
		$mime = $imgsize['mime'];
		switch($mime){
			case 'image/gif':
				$image_create = "imagecreatefromgif";
				$image = "imagegif";
				break;
	
			case 'image/png':
				$image_create = "imagecreatefrompng";
				$image = "imagepng";
				// $quality = 7;
				break;
	
			case 'image/jpeg':
				$image_create = "imagecreatefromjpeg";
				$image = "imagejpeg";
				// $quality = 10;
				break;
	
			default:
				return false;
				break;
		}
		$dst_img = imagecreatetruecolor($max_width, $max_height);
		$src_img = $image_create($source_file);
		
		$width_new = $height * $max_width / $max_height;
		$height_new = $width * $max_height / $max_width;
		// if the new width is greater than the actual width of the image, then the height is too large and the rest cut off, or vice versa
		if($width_new > $width){
			//cut point by height
			$h_point = (($height - $height_new) / 2);
			//copy image
			imagecopyresampled($dst_img, $src_img, 0, 0, 0, $h_point, $max_width, $max_height, $width, $height_new);
		}else{
			//cut point by width
			$w_point = (($width - $width_new) / 2);
			imagecopyresampled($dst_img, $src_img, 0, 0, $w_point, 0, $max_width, $max_height, $width_new, $height);
		}
		$image($dst_img, $dst_dir, $quality);
		if($dst_img)imagedestroy($dst_img);
		if($src_img)imagedestroy($src_img);
	}
	//usage example
	//resize and crop image by center  ********* ///////////////// ----------- ++++++++++++++++++ 
	
?>