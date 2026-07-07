<?php
  if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $selectedBranch = $_POST["branch_id"];
    if ($selectedBranch) {
      $_SESSION[ 'adm_branch' ] = $selectedBranch;
        echo '<script>window.location.href = "'.$_SERVER['REQUEST_URI'].'";</script>';
    }
  }
?>
<div class="headerbar"> <a class="menutoggle"><i class="fa fa-bars"></i></a>
  <div class="header-right">
    <ul class="headermenu">
    <!-- <?php
     //  if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
        ?>
        <li>
      <form method="post">
        <select name="branch_id" id="branch_id" onchange="this.form.submit()" class="form-control">
          <option value="">Select Branch</option>
          <?php
            // $query_branch = "SELECT * FROM branch_detail WHERE branch_status=1";
            // $result_branch = $con->query( $query_branch );
            // while ( $row_branch = $result_branch->fetch_object() ) {
            ?>
            <option <?php // if($row_branch->branch_id==$_SESSION['adm_branch']){ ?>selected<?php // } ?> value="<?php // echo $row_branch->branch_id?>"><?php // echo $row_branch->branch_name?></option>
          <?php // } ?> 
        </select>
      </form> 
      </li>
      <?php // } ?> -->
      <li>
        <div class="btn-group">

        
          <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown"> <img src="img/loggeduser.png" alt="" /> <?php echo $_SESSION['adm_username']; ?> <span class="caret"></span> </button>
          <ul class="dropdown-menu dropdown-menu-usermenu pull-right">
            <li><a href="profile.php"><i class="glyphicon glyphicon-user"></i> My Profile</a></li>
            <li><a href="logout.php"><i class="glyphicon glyphicon-log-out"></i> Sign Out</a></li>
          </ul>
        </div>
      </li>
      
      <!----- TRANSLATE GUJARATI ---------> 
      <!-- <div id="google_translate_element"> --> 
      <!----- TRANSLATE GUJARATI ---------> 
      <!-- <style>
    .goog-te-gadget-simple
    {
        padding: 0px !important;
        line-height: 2;
        color: #fff !important;
        vertical-align: middle;
        background-color: #FF7131 !important;
        border: 1px solid #FF7131 !important;
        border-radius: 10px;
        width: 100%;
        float: right;
        margin-top: 10px;
        text-align: center !important;
    }
    .goog-te-banner-frame.skiptranslate
    {
        display: none !important;
    }
    body
    {
        top: 0px !important;
    }       
    .goog-te-gadget-icon
    {
        background: none !important;
        display: none;
        color: #fff !important;
    }       
    .goog-te-gadget-simple .goog-te-menu-value
    {
        color: #fff !important;
        font-size: 15px !important;
        font-family: 'Open Sans' , sans-serif;
         text-decoration: none !important;
    }
    .goog-te-gadget-simple .goog-te-menu-value span {
       color: #fff !important;
    }
</style>
<script type="text/javascript">
    function googleTranslateElementInit() {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        , includedLanguages: "gu"}, 'google_translate_element');
    }
</script>
<script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script> --> 
      <!----- TRANSLATE GUJARATI --------->
      
    </ul>
  </div>
  <!-- header-right --> 
  <!----- TRANSLATE GUJARATI ---------> 
  
</div>
<!-- headerbar --> 

