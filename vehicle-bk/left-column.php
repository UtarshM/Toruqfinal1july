<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.4.1/css/all.css" integrity="sha384-5sAR7xN1Nv6T6+dT2mhtzEpVJvfS3NScPQTrOxhwjIuvcA67KV2R5Jz6kr4abQsz" crossorigin="anonymous">
<?php
$file_array = explode( "/", $_SERVER[ 'SCRIPT_NAME' ] );
$file_name = $file_array[ count( $file_array ) - 1 ];
?>
<div class="leftpanel">
  <div class="logopanel"> 
    <center>
      <a href="#"><img src="img/logo.jpg" width="150px"> </a>
    </center>
  </div>
  <!-- logopanel -->
  <div class="leftpanelinner"> 
    <!-- This is only visible to small devices  -->
     
    <h5 class="sidebartitle"></h5>
    <ul class="nav nav-pills nav-stacked nav-bracket">

    <?php
      if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
        ?>
      <?php
      if ( $file_name == "admin_view.php" || $file_name == "admin_edit.php" || $file_name == "admin_add.php" || $file_name == "login_log.php" ) { //// Page  
        ?>
      <li class="nav-parent active"><a href="admin_view.php"><i class="fa fa-users"></i> <span>Sub Admin</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "admin_add.php" || $file_name == "admin_edit.php") { ?>class="active" <?php } ?>><a href="admin_add.php"><i class="fa fa-users"></i> Add Sub Admin</a></li>
          <li <?php if ($file_name == "admin_view.php") { ?>class="active" <?php } ?>><a href="admin_view.php"><i class="fa fa-users"></i> View Sub Admin</a></li>
          <li <?php if ($file_name == "login_log.php") { ?>class="active" <?php } ?>><a href="login_log.php"><i class="fa fa-users"></i> Admin Login Logs </a></li>
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="admin_view.php"><i class="fa fa-users"></i> <span>Sub Admin</span></a>
        <ul class="children">
          <li><a href="admin_add.php"><i class="fa fa-users"></i> Add Sub Admin</a></li>
          <li><a href="admin_view.php"><i class="fa fa-users"></i> View Sub Admin</a></li>
          <li><a href="login_log.php"><i class="fa fa-users"></i> Admin Login Logs</a></li>
        </ul>
      </li>
      <?php
      } // Page
      } // Admin  
      ?>

    <?php
    if ($_SESSION['adm_type'] == 0) { // Admin 
    
        if ($file_name == "company_view.php" || $file_name == "company_edit.php" || $file_name == "company_add.php") { //// Page  
        ?>
            <li class="nav-parent active"><a href="company_view.php"><i class="fa fa-table"></i> <span>Company</span></a>
                <ul class="children" style="display:block;">
                    <li <?php if ($file_name == "company_add.php" || $file_name == "company_edit.php") { ?>class="active" <?php } ?>><a href="company_add.php"><i class="fa fa-table"></i> Add Company</a></li>
                    <li <?php if ($file_name == "company_view.php") { ?>class="active" <?php } ?>><a href="company_view.php"><i class="fa fa-table"></i> View Company</a></li>
                </ul>
            </li>
        <?php } else { ?>
            <li class="nav-parent"><a href="company_view.php"><i class="fa fa-table"></i> <span>Company</span></a>
                <ul class="children">
                    <li><a href="company_add.php"><i class="fa fa-table"></i> Add Company</a></li>
                    <li><a href="company_view.php"><i class="fa fa-table"></i> View Company</a></li>
                </ul>
            </li>
    <?php
        } // Page
    } // Admin  
    ?>

<?php
    if ($_SESSION['adm_type'] == 0) { // Admin 
    
        if ($file_name == "category_view.php" || $file_name == "category_edit.php" || $file_name == "category_add.php") { //// Page  
        ?>
            <li class="nav-parent active"><a href="category_view.php"><i class="fa fa-table"></i> <span>Category</span></a>
                <ul class="children" style="display:block;">
                    <li <?php if ($file_name == "category_add.php" || $file_name == "category_edit.php") { ?>class="active" <?php } ?>><a href="category_add.php"><i class="fa fa-table"></i> Add Category</a></li>
                    <li <?php if ($file_name == "category_view.php") { ?>class="active" <?php } ?>><a href="category_view.php"><i class="fa fa-table"></i> View Category</a></li>
                </ul>
            </li>
        <?php } else { ?>
            <li class="nav-parent"><a href="category_view.php"><i class="fa fa-table"></i> <span>Category</span></a>
                <ul class="children">
                    <li><a href="category_add.php"><i class="fa fa-table"></i> Add Category</a></li>
                    <li><a href="category_view.php"><i class="fa fa-table"></i> View Category</a></li>
                </ul>
            </li>
    <?php
        } // Page
    } // Admin  
    ?>

<?php
    if ($_SESSION['adm_type'] == 0) { // Admin 
    
        if ($file_name == "agent_view.php" || $file_name == "agent_edit.php" || $file_name == "agent_add.php") { //// Page  
        ?>
            <li class="nav-parent active"><a href="agent_view.php"><i class="fa fa-table"></i> <span>Agent</span></a>
                <ul class="children" style="display:block;">
                    <li <?php if ($file_name == "agent_add.php" || $file_name == "agent_edit.php") { ?>class="active" <?php } ?>><a href="agent_add.php"><i class="fa fa-table"></i> Add Agent</a></li>
                    <li <?php if ($file_name == "agent_view.php") { ?>class="active" <?php } ?>><a href="agent_view.php"><i class="fa fa-table"></i> View Agent</a></li>
                </ul>
            </li>
        <?php } else { ?>
            <li class="nav-parent"><a href="agent_view.php"><i class="fa fa-table"></i> <span>Agent</span></a>
                <ul class="children">
                    <li><a href="agent_add.php"><i class="fa fa-table"></i> Add Agent</a></li>
                    <li><a href="agent_view.php"><i class="fa fa-table"></i> View Agent</a></li>
                </ul>
            </li>
    <?php
        } // Page
    } // Admin  
    ?>

<?php
    if ($_SESSION['adm_type'] == 0) { // Admin 
    
        if ($file_name == "qutrel_one_view.php" || $file_name == "qutrel_one_edit.php" || $file_name == "qutrel_one_add.php") { //// Page  
        ?>
            <li class="nav-parent active"><a href="qutrel_one_view.php"><i class="fa fa-table"></i> <span>Quotation Relationship - 1</span></a>
                <ul class="children" style="display:block;">
                    <li <?php if ($file_name == "qutrel_one_add.php" || $file_name == "qutrel_one_edit.php") { ?>class="active" <?php } ?>><a href="qutrel_one_add.php"><i class="fa fa-table"></i> Add Quotation Relationship - 1</a></li>
                    <li <?php if ($file_name == "qutrel_one_view.php") { ?>class="active" <?php } ?>><a href="qutrel_one_view.php"><i class="fa fa-table"></i> View Quotation Relationship - 1</a></li>
                </ul>
            </li>
        <?php } else { ?>
            <li class="nav-parent"><a href="qutrel_one_view.php"><i class="fa fa-table"></i> <span>Quotation Relationship - 1</span></a>
                <ul class="children">
                    <li><a href="qutrel_one_add.php"><i class="fa fa-table"></i> Add Quotation Relationship - 1</a></li>
                    <li><a href="qutrel_one_view.php"><i class="fa fa-table"></i> View Quotation Relationship - 1</a></li>
                </ul>
            </li>
    <?php
        } // Page
    } // Admin  
    ?>

<?php
    if ($_SESSION['adm_type'] == 0) { // Admin 
    
        if ($file_name == "qutrel_two_view.php" || $file_name == "qutrel_two_edit.php" || $file_name == "qutrel_two_add.php") { //// Page  
        ?>
            <li class="nav-parent active"><a href="qutrel_two_view.php"><i class="fa fa-table"></i> <span>Quotation Relationship - 2</span></a>
                <ul class="children" style="display:block;">
                    <li <?php if ($file_name == "qutrel_two_add.php" || $file_name == "qutrel_two_edit.php") { ?>class="active" <?php } ?>><a href="qutrel_two_add.php"><i class="fa fa-table"></i> Add Quotation Relationship - 2</a></li>
                    <li <?php if ($file_name == "qutrel_two_view.php") { ?>class="active" <?php } ?>><a href="qutrel_two_view.php"><i class="fa fa-table"></i> View Quotation Relationship - 2</a></li>
                </ul>
            </li>
        <?php } else { ?>
            <li class="nav-parent"><a href="qutrel_two_view.php"><i class="fa fa-table"></i> <span>Quotation Relationship - 2</span></a>
                <ul class="children">
                    <li><a href="qutrel_two_add.php"><i class="fa fa-table"></i> Add Quotation Relationship - 2</a></li>
                    <li><a href="qutrel_two_view.php"><i class="fa fa-table"></i> View Quotation Relationship - 2</a></li>
                </ul>
            </li>
    <?php
        } // Page
    } // Admin  
    ?>
    <?php
    if ($_SESSION['adm_type'] == 0) { // Admin 
    
        if ($file_name == "qutrel_three_view.php" || $file_name == "qutrel_three_edit.php" || $file_name == "qutrel_three_add.php") { //// Page  
        ?>
            <li class="nav-parent active"><a href="qutrel_three_view.php"><i class="fa fa-table"></i> <span>Quotation Relationship - 3</span></a>
                <ul class="children" style="display:block;">
                    <li <?php if ($file_name == "qutrel_three_add.php" || $file_name == "qutrel_three_edit.php") { ?>class="active" <?php } ?>><a href="qutrel_three_add.php"><i class="fa fa-table"></i> Add Quotation Relationship - 3</a></li>
                    <li <?php if ($file_name == "qutrel_three_view.php") { ?>class="active" <?php } ?>><a href="qutrel_three_view.php"><i class="fa fa-table"></i> View Quotation Relationship - 3</a></li>
                </ul>
            </li>
        <?php } else { ?>
            <li class="nav-parent"><a href="qutrel_three_view.php"><i class="fa fa-table"></i> <span>Quotation Relationship - 3</span></a>
                <ul class="children">
                    <li><a href="qutrel_three_add.php"><i class="fa fa-table"></i> Add Quotation Relationship - 3</a></li>
                    <li><a href="qutrel_three_view.php"><i class="fa fa-table"></i> View Quotation Relationship - 3</a></li>
                </ul>
            </li>
    <?php
        } // Page
    } // Admin  
    ?>

    <?php if ($_SESSION['adm_type'] == 0) { // Admin 
  
      if ($file_name == "genral_documents.php") {  ?>
          <li class="active"><a href="genral_documents.php"><i class="fa fa-home"></i> <span>Documents </span></a></li>
          <?php } else { ?>
          <li><a href="genral_documents.php"><i class="fa fa-home"></i> <span>Documents</span></a></li>
          <?php }
          
        } // Admin  ?>
      <!-- <?php
      // if ( $file_name == "branch_view.php" || $file_name == "branch_edit.php" || $file_name == "branch_add.php" ) { //// Page  
        ?>
      <li class="nav-parent active"><a href="branch_view.php"><i class="fa fa-table"></i> <span>Branch</span></a>
        <ul class="children" style="display:block;">
          <li <?php // if ($file_name == "branch_add.php" || $file_name == "branch_edit.php") { ?>class="active" <?php // } ?>><a href="branch_add.php"><i class="fa fa-table"></i> Add Branch</a></li>
          <li <?php // if ($file_name == "branch_view.php") { ?>class="active" <?php // } ?>><a href="branch_view.php"><i class="fa fa-table"></i> View Branch</a></li>
        </ul>
      </li>
      <?php // } else { ?>
      <li class="nav-parent"><a href="branch_view.php"><i class="fa fa-table"></i> <span>Branch</span></a>
        <ul class="children">
          <li><a href="branch_add.php"><i class="fa fa-table"></i> Add Branch</a></li>
          <li><a href="branch_view.php"><i class="fa fa-table"></i> View Branch</a></li>
        </ul>
      </li>
      <?php
      // } // Page
      
      ?> -->
      <?php
      // Strore  moDule Rights
      $query_module_detail_left = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
      $module_query_left = $con->query( $query_module_detail_left );
      $row_md_id_left = $module_query_left->fetch_array();
      // echo $row_state['md_id']; exit;
      $md_right_left = explode( ",", $row_md_id_left[ 'md_id' ] );
      // Strore  moDule Rights
      ?>

    <!-- <?php
      // Check Module Rights
      // if ( in_array( "1", $md_right_left ) ) {
      //   if ( $file_name == "settings_edit.php" || $file_name == "settings_view.php" ) {
          ?>
      <li class="nav-parent active"><a href="settings_view.php"><i class="fa fa-gears"></i> <span>Settings</span></a>
        <ul class="children" style="display:block;">
          <li <?php // if ($file_name == "settings_view.php") { ?>class="active" <?php //  } ?>><a href="settings_view.php"><i class="fa fa-th-list"></i> Settings View</a></li>
        </ul>
      </li>
      <?php // } else { ?>
      <li class="nav-parent"><a href="settings_view.php"><i class="fa fa-gears"></i> <span>Settings </span></a>
        <ul class="children">
          <li><a href="settings_view.php"><i class="fa fa-th-list"></i> Settings View</a></li>
        </ul>
      </li>
      <?php
      // } // Page
      // } // Check Module Rights 
      ?> -->


    <h4 class="text-left">Torque Auto Advisor</h4>
    
      

      <?php if ($file_name == "insurance_dashboard.php") {  ?>
      <li class="active"><a href="insurance_dashboard.php"><i class="fa fa-home"></i> <span>Dashboard </span></a></li>
      <?php } else { ?>
      <li><a href="insurance_dashboard.php"><i class="fa fa-home"></i> <span>Dashboard</span></a></li>
      <?php } ?>
      

      
      
      <?php
      // Check Module Rights
      if ( in_array( "3", $md_right_left ) ) {
        if ( $file_name == "inquiry_add.php" || $file_name == "inquiry_edit.php" || $file_name == "inquiry_view.php") {
          ?>
      <li class="nav-parent active"><a href="inquiry_view.php"><i class="fa fa-file"></i> <span>Inquiry</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "inquiry_add.php" || $file_name == "inquiry_edit.php") { ?>class="active" <?php } ?>><a href="inquiry_add.php"><i class="fa fa-file"></i> Add Inquiry</a></li>
          <li <?php if ($file_name == "inquiry_view.php") { ?>class="active" <?php } ?>><a href="inquiry_view.php"><i class="fa fa-file"></i> View Inquiry</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="inquiry_view.php"><i class="fa fa-file"></i> <span>Inquiry </span></a>
        <ul class="children">
          <li><a href="inquiry_add.php"><i class="fa fa-file"></i>Add Inquiry</a></li>
          <li><a href="inquiry_view.php"><i class="fa fa-file"></i> View Inquiry</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

      
      
      <?php
      // Check Module Rights
      if ( in_array( "3", $md_right_left ) ) {
        if ( $file_name == "global_add.php" || $file_name == "global_edit.php" || $file_name == "global_view.php" || $file_name == "global_documents.php") {
          ?>
      <li class="nav-parent active"><a href="global_view.php"><i class="fa fa-file"></i> <span>Global Data</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "global_add.php" || $file_name == "global_edit.php") { ?>class="active" <?php } ?>><a href="global_add.php"><i class="fa fa-file"></i> Add Global Data</a></li>
          <li <?php if ($file_name == "global_view.php") { ?>class="active" <?php } ?>><a href="global_view.php"><i class="fa fa-file"></i> View Global Data</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="global_view.php"><i class="fa fa-file"></i> <span>Global Data </span></a>
        <ul class="children">
          <li><a href="global_add.php"><i class="fa fa-file"></i>Add Global Data</a></li>
          <li><a href="global_view.php"><i class="fa fa-file"></i> View Global Data</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

    <?php
      // Check Module Rights
      if ( in_array( "3", $md_right_left ) ) {
        if ( $file_name == "taken_add.php" || $file_name == "taken_edit.php" || $file_name == "taken_view.php" || $file_name == "taken_documents.php" || $file_name == "taken_week_view.php") {
          ?>
      <li class="nav-parent active"><a href="taken_view.php"><i class="fa fa-file"></i> <span>Taken Data</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "taken_add.php" || $file_name == "taken_edit.php") { ?>class="active" <?php } ?>><a href="taken_add.php"><i class="fa fa-file"></i> Add Taken Data</a></li>
          <li <?php if ($file_name == "taken_view.php") { ?>class="active" <?php } ?>><a href="taken_view.php"><i class="fa fa-file"></i> View Taken Data</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="taken_view.php"><i class="fa fa-file"></i> <span>Taken Data </span></a>
        <ul class="children">
          <li><a href="taken_add.php"><i class="fa fa-file"></i>Add Taken Data</a></li>
          <li><a href="taken_view.php"><i class="fa fa-file"></i> View Taken Data</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>
      
      <?php
      // Check Module Rights
      if ( in_array( "3", $md_right_left ) ) {
        if ( $file_name == "renewal_add.php" || $file_name == "renewal_edit.php" || $file_name == "renewal_view.php" || $file_name == "ren_rem_view.php" || $file_name == "renewal_documents.php") {
          ?>
      <li class="nav-parent active"><a href="renewal_view.php"><i class="fa fa-file"></i> <span>Renewal Data</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "renewal_add.php" || $file_name == "renewal_edit.php") { ?>class="active" <?php } ?>><a href="renewal_add.php"><i class="fa fa-file"></i> Add Renewal Data</a></li>
          <li <?php if ($file_name == "renewal_view.php") { ?>class="active" <?php } ?>><a href="renewal_view.php"><i class="fa fa-file"></i> View Renewal Data</a></li>           
          <li <?php if ($file_name == "ren_rem_view.php") { ?>class="active" <?php } ?>><a href="ren_rem_view.php"><i class="fa fa-file"></i> View Renewal Reminder</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="renewal_view.php"><i class="fa fa-file"></i> <span>Renewal Data </span></a>
        <ul class="children">
          <li><a href="renewal_add.php"><i class="fa fa-file"></i>Add Renewal Data</a></li>
          <li><a href="renewal_view.php"><i class="fa fa-file"></i> View Renewal Data</a></li>
          <li><a href="ren_rem_view.php"><i class="fa fa-file"></i> View Renewal Reminder</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

<?php
      // Check Module Rights
      if ( in_array( "8", $md_right_left ) ) {
        if ( $file_name == "claim_add.php" || $file_name == "claim_edit.php" || $file_name == "claim_view.php" || $file_name == "claim_documents.php") {
          ?>
      <li class="nav-parent active"><a href="claim_view.php"><i class="fa fa-file"></i> <span>Claim</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "claim_add.php" || $file_name == "claim_edit.php") { ?>class="active" <?php } ?>><a href="claim_add.php"><i class="fa fa-file"></i> Add Claim</a></li>
          <li <?php if ($file_name == "claim_view.php") { ?>class="active" <?php } ?>><a href="claim_view.php"><i class="fa fa-file"></i> View Claim</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="claim_view.php"><i class="fa fa-file"></i> <span>Claim </span></a>
        <ul class="children">
          <li><a href="claim_add.php"><i class="fa fa-file"></i>Add Claim</a></li>
          <li><a href="claim_view.php"><i class="fa fa-file"></i> View Claim</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

  <?php
      // Check Module Rights
      if ( in_array( "11", $md_right_left ) ) {
        if ( $file_name == "policy_add.php" || $file_name == "policy_edit.php" || $file_name == "policy_view.php") {
          ?>
      <li class="nav-parent active"><a href="policy_view.php"><i class="fa fa-file"></i> <span>Policy PDF</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "policy_add.php" || $file_name == "policy_edit.php") { ?>class="active" <?php } ?>><a href="policy_add.php"><i class="fa fa-file"></i> Add Policy PDF</a></li>
          <li <?php if ($file_name == "policy_view.php") { ?>class="active" <?php } ?>><a href="policy_view.php"><i class="fa fa-file"></i> View Policy PDF</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="policy_view.php"><i class="fa fa-file"></i> <span>Policy PDF </span></a>
        <ul class="children">
          <li><a href="policy_add.php"><i class="fa fa-file"></i>Add Policy PDF</a></li>
          <li><a href="policy_view.php"><i class="fa fa-file"></i> View Policy PDF</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

<?php
      // Check Module Rights
      if ( in_array( "11", $md_right_left ) ) {
        if ( $file_name == "insurance_guide_add.php" || $file_name == "insurance_guide_edit.php" || $file_name == "insurance_guide_view.php") {
          ?>
      <li class="nav-parent active"><a href="insurance_guide_view.php"><i class="fa fa-file"></i> <span>Policy Check Form</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "insurance_guide_add.php" || $file_name == "insurance_guide_edit.php") { ?>class="active" <?php } ?>><a href="insurance_guide_add.php"><i class="fa fa-file"></i> Add Policy Check Form</a></li>
          <li <?php if ($file_name == "insurance_guide_view.php") { ?>class="active" <?php } ?>><a href="insurance_guide_view.php"><i class="fa fa-file"></i> View Policy Check Form</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="insurance_guide_view.php"><i class="fa fa-file"></i> <span>Policy Check Form </span></a>
        <ul class="children">
          <li><a href="insurance_guide_add.php"><i class="fa fa-file"></i>Add Policy Check Form</a></li>
          <li><a href="insurance_guide_view.php"><i class="fa fa-file"></i> View Policy Check Form</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

    <?php
      // Check Module Rights
      if ( in_array( "17", $md_right_left ) ) {
        if ( $file_name == "qutcalc_one.php") {
          ?>
      <li class="active"><a href="qutcalc_one.php"><i class="fa fa-calculator"></i> <span>Rate Calculator - 1</span></a></li>
      <?php } else { ?>
      <li><a href="qutcalc_one.php"><i class="fa fa-calculator"></i> <span>Rate Calculator - 1 </span></a></li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

<?php
      // Check Module Rights
      if ( in_array( "18", $md_right_left ) ) {
        if ( $file_name == "qutcalc_two.php") {
          ?>
      <li class="active"><a href="qutcalc_two.php"><i class="fa fa-calculator"></i> <span>Rate Calculator - 2</span></a></li>
      <?php } else { ?>
      <li><a href="qutcalc_two.php"><i class="fa fa-calculator"></i> <span>Rate Calculator - 2 </span></a></li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

<?php
      // Check Module Rights
      if ( in_array( "19", $md_right_left ) ) {
        if ( $file_name == "qutcalc_three.php") {
          ?>
      <li class="active"><a href="qutcalc_three.php"><i class="fa fa-calculator"></i> <span>Rate Calculator - 3</span></a></li>
      <?php } else { ?>
      <li><a href="qutcalc_three.php"><i class="fa fa-calculator"></i> <span>Rate Calculator - 3 </span></a></li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>
 
<HR></HR>
<h4 class="text-left">RTO</h4>

<?php if ($file_name == "rto_dashboard.php") {  ?>
      <li class="active"><a href="rto_dashboard.php"><i class="fa fa-home"></i> <span>Dashboard </span></a></li>
      <?php } else { ?>
      <li><a href="rto_dashboard.php"><i class="fa fa-home"></i> <span>Dashboard</span></a></li>
      <?php } ?>

      <!-- <?php
      // Check Module Rights
      // if ( in_array( "4", $md_right_left ) ) {
      //   if ( $file_name == "service_add.php" || $file_name == "service_edit.php" || $file_name == "service_view.php") {
          ?>
      <li class="nav-parent active"><a href="service_view.php"><i class="fa fa-briefcase"></i> <span>Service</span></a>
        <ul class="children" style="display:block;">
          <li <?php // if ($file_name == "service_add.php" || $file_name == "service_edit.php") { ?>class="active" <?php // } ?>><a href="service_add.php"><i class="fa fa-briefcase"></i> Add Service</a></li>
          <li <?php // if ($file_name == "service_view.php") { ?>class="active" <?php // } ?>><a href="service_view.php"><i class="fa fa-briefcase"></i> View Service</a></li>           
        </ul>
      </li>
      <?php // } else { ?>
      <li class="nav-parent"><a href="service_view.php"><i class="fa fa-briefcase"></i> <span>Service </span></a>
        <ul class="children">
          <li><a href="service_add.php"><i class="fa fa-briefcase"></i>Add Service</a></li>
          <li><a href="service_view.php"><i class="fa fa-briefcase"></i> View Service</a></li>
         </ul>
      </li>
      <?php
      // } // Page
      // } // Check Module Rights 
      ?> -->

      <?php
      // Check Module Rights
      if ( in_array( "6", $md_right_left ) ) {
        if ( $file_name == "license_add.php" || $file_name == "license_edit.php" || $file_name == "license_view.php" || $file_name == "license_com_view.php" || $file_name == "license_documents.php" || $file_name == "license_task_view.php" || $file_name == "license_task_edit.php") {
          ?>
      <li class="nav-parent active"><a href="license_view.php"><i class="fa fa-file"></i> <span>License Work</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "license_add.php" || $file_name == "license_edit.php") { ?>class="active" <?php } ?>><a href="license_add.php"><i class="fa fa-file"></i> Add License Work</a></li>
          <li <?php if ($file_name == "license_view.php") { ?>class="active" <?php } ?>><a href="license_view.php"><i class="fa fa-file"></i> View [Pending]</a></li>           
          <li <?php if ($file_name == "license_com_view.php") { ?>class="active" <?php } ?>><a href="license_com_view.php"><i class="fa fa-file"></i> Completed</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="license_view.php"><i class="fa fa-file"></i> <span>License Work </span></a>
        <ul class="children">
          <li><a href="license_add.php"><i class="fa fa-file"></i>Add License Work</a></li>
          <li><a href="license_view.php"><i class="fa fa-file"></i> View [Pending]</a></li>
          <li><a href="license_com_view.php"><i class="fa fa-file"></i> Completed</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

      <?php
      // Check Module Rights
      if ( in_array( "7", $md_right_left ) ) {
        if ( $file_name == "vahan_add.php" || $file_name == "vahan_edit.php" || $file_name == "vahan_view.php" || $file_name == "vahan_com_view.php" || $file_name == "vahan_documents.php" || $file_name == "vahan_task_view.php" || $file_name == "vahan_task_edit.php") {
          ?>
      <li class="nav-parent active"><a href="vahan_view.php"><i class="fa fa-file"></i> <span>Vahan Work</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "vahan_add.php" || $file_name == "vahan_edit.php") { ?>class="active" <?php } ?>><a href="vahan_add.php"><i class="fa fa-file"></i> Add Vahan Work</a></li>
          <li <?php if ($file_name == "vahan_view.php") { ?>class="active" <?php } ?>><a href="vahan_view.php"><i class="fa fa-file"></i> View [Pending]</a></li>           
          <li <?php if ($file_name == "vahan_com_view.php") { ?>class="active" <?php } ?>><a href="vahan_com_view.php"><i class="fa fa-file"></i> Completed</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="vahan_view.php"><i class="fa fa-file"></i> <span>Vahan Work </span></a>
        <ul class="children">
          <li><a href="vahan_add.php"><i class="fa fa-file"></i>Add Vahan Work</a></li>
          <li><a href="vahan_view.php"><i class="fa fa-file"></i> View [Pending]</a></li>
          <li><a href="vahan_com_view.php"><i class="fa fa-file"></i> Completed</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

<?php
      // Check Module Rights
      if ( in_array( "12", $md_right_left ) ) {
        if ( $file_name == "fitper_add.php" || $file_name == "fitper_edit.php" || $file_name == "fitper_view.php") {
          ?>
      <li class="nav-parent active"><a href="fitper_view.php"><i class="fa fa-file"></i> <span>Fitness & Permit PDF</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "fitper_add.php" || $file_name == "fitper_edit.php") { ?>class="active" <?php } ?>><a href="fitper_add.php"><i class="fa fa-file"></i> Add Fitness & Permit PDF</a></li>
          <li <?php if ($file_name == "fitper_view.php") { ?>class="active" <?php } ?>><a href="fitper_view.php"><i class="fa fa-file"></i> View Fitness & Permit PDF</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="fitper_view.php"><i class="fa fa-file"></i> <span>Fitness & Permit PDF </span></a>
        <ul class="children">
          <li><a href="fitper_add.php"><i class="fa fa-file"></i>Add Fitness & Permit PDF</a></li>
          <li><a href="fitper_view.php"><i class="fa fa-file"></i> View Fitness & Permit PDF</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

<HR></HR>
<h4 class="text-left">ADMIN</h4>

      <?php
      // Check Module Rights
      if ( in_array( "9", $md_right_left ) ) {
         if ( $file_name == "daily_hisab_add.php" || $file_name == "daily_hisab_edit.php" || $file_name == "daily_hisab_view.php") {
          ?>
      <li class="nav-parent active"><a href="daily_hisab_view.php"><i class="fa fa-upload"></i> <span>Daily Hisab</span></a>
        <ul class="children" style="display:block;">
          <li <?php  if ($file_name == "daily_hisab_add.php" || $file_name == "daily_hisab_edit.php") { ?>class="active" <?php   } ?>><a href="daily_hisab_add.php"><i class="fa fa-upload"></i> Add Daily Hisab</a></li>
          <li <?php  if ($file_name == "daily_hisab_view.php") { ?>class="active" <?php   } ?>><a href="daily_hisab_view.php"><i class="fa fa-upload"></i> View Daily Hisab</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="daily_hisab_view.php"><i class="fa fa-upload"></i> <span>Daily Hisab </span></a>
        <ul class="children">
          <li><a href="daily_hisab_add.php"><i class="fa fa-upload"></i>Add Daily Hisab</a></li>
          <li><a href="daily_hisab_view.php"><i class="fa fa-upload"></i> View Daily Hisab</a></li>
         </ul>
      </li>
      <?php
       } // Page
      } // Check Module Rights 
      ?>

      <?php
      // Check Module Rights
      if (in_array("10",$md_right_left ) ) {
         if ( $file_name == "office_expenses_add.php" || $file_name == "office_expenses_edit.php" || $file_name == "office_expenses_view.php") {
          ?>
      <li class="nav-parent active"><a href="office_expenses_view.php"><i class="fa fa-upload"></i> <span>Office Expenses</span></a>
        <ul class="children" style="display:block;">
          <li <?php  if ($file_name == "office_expenses_add.php" || $file_name == "office_expenses_edit.php") { ?>class="active" <?php   } ?>><a href="office_expenses_add.php"><i class="fa fa-upload"></i> Add Office Expenses</a></li>
          <li <?php  if ($file_name == "office_expenses_view.php") { ?>class="active" <?php   } ?>><a href="office_expenses_view.php"><i class="fa fa-upload"></i> View Office Expenses</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="office_expenses_view.php"><i class="fa fa-upload"></i> <span>Office Expenses </span></a>
        <ul class="children">
          <li><a href="office_expenses_add.php"><i class="fa fa-upload"></i>Add Office Expenses</a></li>
          <li><a href="office_expenses_view.php"><i class="fa fa-upload"></i> View Office Expenses</a></li>
         </ul>
      </li>
      <?php
       } // Page
      } // Check Module Rights 
      ?>

<?php
      // Check Module Rights
      if ( in_array( "13", $md_right_left ) ) {
         if ( $file_name == "cheque_add.php" || $file_name == "cheque_edit.php" || $file_name == "cheque_view.php") {
          ?>
      <li class="nav-parent active"><a href="cheque_view.php"><i class="fa fa-upload"></i> <span>Cheque</span></a>
        <ul class="children" style="display:block;">
          <li <?php  if ($file_name == "cheque_add.php" || $file_name == "cheque_edit.php") { ?>class="active" <?php   } ?>><a href="cheque_add.php"><i class="fa fa-upload"></i> Add Cheque</a></li>
          <li <?php  if ($file_name == "cheque_view.php") { ?>class="active" <?php   } ?>><a href="cheque_view.php"><i class="fa fa-upload"></i> View Cheque</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="cheque_view.php"><i class="fa fa-upload"></i> <span>Cheque </span></a>
        <ul class="children">
          <li><a href="cheque_add.php"><i class="fa fa-upload"></i>Add Cheque</a></li>
          <li><a href="cheque_view.php"><i class="fa fa-upload"></i> View Cheque</a></li>
         </ul>
      </li>
      <?php
       } // Page
      } // Check Module Rights 
      ?>

<?php
      // Check Module Rights
      if ( in_array( "14", $md_right_left ) ) {
         if ( $file_name == "salary_add.php" || $file_name == "salary_edit.php" || $file_name == "salary_view.php") {
          ?>
      <li class="nav-parent active"><a href="salary_view.php"><i class="fa fa-upload"></i> <span>Salary</span></a>
        <ul class="children" style="display:block;">
          <li <?php  if ($file_name == "salary_add.php" || $file_name == "salary_edit.php") { ?>class="active" <?php   } ?>><a href="salary_add.php"><i class="fa fa-upload"></i> Add Salary</a></li>
          <li <?php  if ($file_name == "salary_view.php") { ?>class="active" <?php   } ?>><a href="salary_view.php"><i class="fa fa-upload"></i> View Salary</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="salary_view.php"><i class="fa fa-upload"></i> <span>Salary </span></a>
        <ul class="children">
          <li><a href="salary_add.php"><i class="fa fa-upload"></i>Add Salary</a></li>
          <li><a href="salary_view.php"><i class="fa fa-upload"></i> View Salary</a></li>
         </ul>
      </li>
      <?php
       } // Page
      } // Check Module Rights 
      ?>

<?php
      // Check Module Rights
      if ( in_array( "15", $md_right_left ) ) {
         if ( $file_name == "ughrani_add.php" || $file_name == "ughrani_edit.php" || $file_name == "ughrani_view.php") {
          ?>
      <li class="nav-parent active"><a href="ughrani_view.php"><i class="fa fa-upload"></i> <span>Ughrani</span></a>
        <ul class="children" style="display:block;">
          <li <?php  if ($file_name == "ughrani_add.php" || $file_name == "ughrani_edit.php") { ?>class="active" <?php   } ?>><a href="ughrani_add.php"><i class="fa fa-upload"></i> Add Ughrani</a></li>
          <li <?php  if ($file_name == "ughrani_view.php") { ?>class="active" <?php   } ?>><a href="ughrani_view.php"><i class="fa fa-upload"></i> View Ughrani</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="ughrani_view.php"><i class="fa fa-upload"></i> <span>Ughrani </span></a>
        <ul class="children">
          <li><a href="ughrani_add.php"><i class="fa fa-upload"></i>Add Ughrani</a></li>
          <li><a href="ughrani_view.php"><i class="fa fa-upload"></i> View Ughrani</a></li>
         </ul>
      </li>
      <?php
       } // Page
      } // Check Module Rights 
      ?>

<?php
      // Check Module Rights
      if ( in_array( "16", $md_right_left ) ) {
        if ( $file_name == "customer_add.php" || $file_name == "customer_edit.php" || $file_name == "customer_view.php" || $file_name == "customer_documents.php") {
          ?>
      <li class="nav-parent active"><a href="customer_view.php"><i class="fa fa-file"></i> <span>Our Customer</span></a>
        <ul class="children" style="display:block;">
          <li <?php if ($file_name == "customer_add.php" || $file_name == "customer_edit.php") { ?>class="active" <?php } ?>><a href="customer_add.php"><i class="fa fa-file"></i> Add Our Customer</a></li>
          <li <?php if ($file_name == "customer_view.php") { ?>class="active" <?php } ?>><a href="customer_view.php"><i class="fa fa-file"></i> View Our Customer</a></li>           
        </ul>
      </li>
      <?php } else { ?>
      <li class="nav-parent"><a href="customer_view.php"><i class="fa fa-file"></i> <span>Our Customer </span></a>
        <ul class="children">
          <li><a href="customer_add.php"><i class="fa fa-file"></i>Add Our Customer</a></li>
          <li><a href="customer_view.php"><i class="fa fa-file"></i> View Our Customer</a></li>
         </ul>
      </li>
      <?php
      } // Page
      } // Check Module Rights  
      ?>

      <!-- <?php
      // Check Module Rights
      // if ( in_array( "5", $md_right_left ) ) {
      //   if ( $file_name == "rto_add.php" || $file_name == "rto_edit.php" || $file_name == "rto_view.php" || $file_name == "rto_documents.php") {
          ?>
      <li class="nav-parent active"><a href="rto_view.php"><i class="fa fa-file"></i> <span>RTO Task</span></a>
        <ul class="children" style="display:block;">
          <li <?php // if ($file_name == "rto_add.php" || $file_name == "rto_edit.php") { ?>class="active" <?php // } ?>><a href="rto_add.php"><i class="fa fa-file"></i> Add RTO Task</a></li>
          <li <?php // if ($file_name == "rto_view.php") { ?>class="active" <?php // } ?>><a href="rto_view.php"><i class="fa fa-file"></i> View RTO Task</a></li>           
        </ul>
      </li>
      <?php // } else { ?>
      <li class="nav-parent"><a href="rto_view.php"><i class="fa fa-file"></i> <span>RTO Task </span></a>
        <ul class="children">
          <li><a href="rto_add.php"><i class="fa fa-file"></i>Add RTO Task</a></li>
          <li><a href="rto_view.php"><i class="fa fa-file"></i> View RTO Task</a></li>
         </ul>
      </li>
      <?php
      // } // Page
      // } // Check Module Rights  
      ?> -->
      <!--  
      <?php
      // Check Module Rights
      // if ( in_array( "8", $md_right_left ) ) {
      //   if ( $file_name == "daily_hisab_add.php" || $file_name == "daily_hisab_edit.php" || $file_name == "daily_hisab_view.php") {
          ?>
      <li class="nav-parent active"><a href="daily_hisab_view.php"><i class="fa fa-upload"></i> <span>Daily Hisab</span></a>
        <ul class="children" style="display:block;">
          <li <?php  // if ($file_name == "daily_hisab_add.php" || $file_name == "daily_hisab_edit.php") { ?>class="active" <?php  // } ?>><a href="daily_hisab_add.php"><i class="fa fa-upload"></i> Add Daily Hisab</a></li>
          <li <?php  // if ($file_name == "daily_hisab_view.php") { ?>class="active" <?php  // } ?>><a href="daily_hisab_view.php"><i class="fa fa-upload"></i> View Daily Hisab</a></li>           
        </ul>
      </li>
      <?php  // } else { ?>
      <li class="nav-parent"><a href="daily_hisab_view.php"><i class="fa fa-upload"></i> <span>Daily Hisab </span></a>
        <ul class="children">
          <li><a href="daily_hisab_add.php"><i class="fa fa-upload"></i>Add Daily Hisab</a></li>
          <li><a href="daily_hisab_view.php"><i class="fa fa-upload"></i> View Daily Hisab</a></li>
         </ul>
      </li>
      <?php
      // } // Page
      // } // Check Module Rights 
      ?>

      <?php  // 
      // if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
      // if ($file_name == "financial_view.php") {  ?>
      <li class="active"><a href="financial_view.php"><i class="fa fa-table"></i> <span>Financial Report </span></a></li>
      <?php  // } else { ?>
      <li><a href="financial_view.php"><i class="fa fa-table"></i> <span>Financial Report</span></a></li>
      <?php  // }
     //  } // Check Module Rights 
      ?> -->

    </ul>
  </div>
</div>
